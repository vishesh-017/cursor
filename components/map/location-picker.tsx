"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export type LocationPick = {
  latitude: number;
  longitude: number;
  label?: string;
};

type SearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  type: string;
};

function ClickCapture({ onPick }: { onPick: (pick: LocationPick) => void }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
  return null;
}

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), 15), {
      animate: true,
    });
  }, [latitude, longitude, map]);
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onPick,
  searchPlaceholder = "Search SG Highway, Law Garden, Maninagar…",
  accuracyMeters,
  liveTracking = false,
  liveLocating = false,
  onUseMyLocation,
  onToggleLive,
}: {
  latitude: number;
  longitude: number;
  onPick: (pick: LocationPick) => void;
  searchPlaceholder?: string;
  /** GPS accuracy radius in meters (shown as circle). */
  accuracyMeters?: number | null;
  liveTracking?: boolean;
  liveLocating?: boolean;
  onUseMyLocation?: () => void;
  onToggleLive?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        setError(null);
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
            cache: "no-store",
          });
          const json = (await res.json()) as {
            success: boolean;
            message?: string;
            data?: { results: SearchResult[] };
          };
          if (!res.ok || !json.success || !json.data) {
            throw new Error(json.message || "Search failed");
          }
          setResults(json.data.results);
          setOpen(true);
        } catch (err) {
          setResults([]);
          setError(err instanceof Error ? err.message : "Search failed");
        } finally {
          setSearching(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  function selectResult(item: SearchResult) {
    onPick({
      latitude: item.latitude,
      longitude: item.longitude,
      label: item.label,
    });
    setQuery(item.label.split(",")[0] ?? item.label);
    setOpen(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative z-[500] border-b border-[var(--border)] bg-[var(--surface-solid)] p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length) setOpen(true);
            }}
            placeholder={searchPlaceholder}
            aria-label="Search location in Ahmedabad"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-10 text-sm outline-none ring-[var(--ring)] focus:ring-2 dark:bg-white/5"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--brand)]" />
          ) : (
            <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand)]" />
          )}
        </div>

        {(onUseMyLocation || onToggleLive) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {onUseMyLocation ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={liveLocating}
                onClick={onUseMyLocation}
                className="rounded-xl"
              >
                {liveLocating && !liveTracking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Navigation className="h-3.5 w-3.5" />
                )}
                Use my location
              </Button>
            ) : null}
            {onToggleLive ? (
              <Button
                type="button"
                size="sm"
                variant={liveTracking ? "default" : "outline"}
                onClick={onToggleLive}
                className="rounded-xl"
              >
                {liveTracking ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Live GPS on
                  </>
                ) : (
                  <>
                    <Navigation className="h-3.5 w-3.5" />
                    Follow live GPS
                  </>
                )}
              </Button>
            ) : null}
            {typeof accuracyMeters === "number" ? (
              <span className="inline-flex items-center rounded-xl border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
                ±{Math.round(accuracyMeters)} m
              </span>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {liveTracking
              ? "Live GPS is updating your pin as you move. Turn it off to search or drag-pin manually."
              : "Use live GPS, search a place, or tap the map to confirm the pin (required)."}
          </p>
        )}
        {open && results.length > 0 ? (
          <ul className="absolute left-3 right-3 top-[4.5rem] max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-xl">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full border-b border-[var(--border)] px-3 py-2.5 text-left text-sm last:border-0 hover:bg-[var(--brand-soft)]"
                  onClick={() => selectResult(item)}
                >
                  <p className="font-medium text-[var(--foreground)] line-clamp-1">
                    {item.label.split(",")[0]}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">
                    {item.label}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {typeof accuracyMeters === "number" && accuracyMeters > 0 ? (
            <Circle
              center={[latitude, longitude]}
              radius={Math.min(accuracyMeters, 400)}
              pathOptions={{
                color: "#2bb5ae",
                fillColor: "#2bb5ae",
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />
          ) : null}
          <Marker position={[latitude, longitude]} icon={markerIcon} />
          <ClickCapture
            onPick={(pick) => {
              onPick(pick);
            }}
          />
          <Recenter latitude={latitude} longitude={longitude} />
        </MapContainer>
      </div>
    </div>
  );
}
