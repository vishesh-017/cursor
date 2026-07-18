"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export type RealtimeLocationState = {
  supported: boolean;
  tracking: boolean;
  locating: boolean;
  error: string | null;
  position: LiveLocation | null;
  startTracking: () => void;
  stopTracking: () => void;
  locateOnce: () => void;
};

function mapError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied — enable GPS for this site.";
    case err.POSITION_UNAVAILABLE:
      return "GPS unavailable right now. Try outdoors or pin the map manually.";
    case err.TIMEOUT:
      return "Location request timed out. Retry live GPS.";
    default:
      return "Could not read your location.";
  }
}

export function useRealtimeLocation(
  enabled = false
): RealtimeLocationState {
  const [tracking, setTracking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<LiveLocation | null>(null);
  const watchId = useRef<number | null>(null);
  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const clearWatch = useCallback(() => {
    if (watchId.current != null && supported) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, [supported]);

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    });
    setError(null);
    setLocating(false);
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    setError(mapError(err));
    setLocating(false);
    setTracking(false);
    clearWatch();
  }, [clearWatch]);

  const locateOnce = useCallback(() => {
    if (!supported) {
      setError("This device/browser does not support GPS.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(applyPosition, onError, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 5_000,
    });
  }, [applyPosition, onError, supported]);

  const startTracking = useCallback(() => {
    if (!supported) {
      setError("This device/browser does not support GPS.");
      return;
    }
    clearWatch();
    setTracking(true);
    setLocating(true);
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      applyPosition,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 2_000,
      }
    );
  }, [applyPosition, clearWatch, onError, supported]);

  const stopTracking = useCallback(() => {
    clearWatch();
    setTracking(false);
    setLocating(false);
  }, [clearWatch]);

  useEffect(() => {
    if (!enabled) {
      stopTracking();
      return;
    }
    startTracking();
    return () => {
      clearWatch();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps -- start once when enabled flips

  useEffect(() => () => clearWatch(), [clearWatch]);

  return {
    supported,
    tracking,
    locating,
    error,
    position,
    startTracking,
    stopTracking,
    locateOnce,
  };
}
