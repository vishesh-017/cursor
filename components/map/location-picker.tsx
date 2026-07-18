"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";

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
}: {
  latitude: number;
  longitude: number;
  onPick: (pick: LocationPick) => void;
  searchPlaceholder?: string;
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
        {error ? (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Search an Ahmedabad place, then confirm the pin on the map (required).
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
          <Marker position={[latitude, longitude]} icon={markerIcon} />
          <ClickCapture onPick={onPick} />
          <Recenter latitude={latitude} longitude={longitude} />
        </MapContainer>
      </div>
    </div>
  );
}
