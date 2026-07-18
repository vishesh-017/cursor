"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  Polygon,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";
import { siteConfig } from "@/config/site";
import type { InfrastructureReport, Priority, Ward } from "@/types";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { statusLabel } from "@/utils/status";

type HeatLatLng = [number, number, number];

type LeafletWithHeat = typeof L & {
  heatLayer: (
    latlngs: HeatLatLng[],
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  ) => L.Layer & { setLatLngs: (latlngs: HeatLatLng[]) => void };
  markerClusterGroup: (options?: Record<string, unknown>) => L.MarkerClusterGroup;
};

const LL = L as LeafletWithHeat;

const priorityWeight: Record<Priority, number> = {
  critical: 1,
  high: 0.82,
  medium: 0.55,
  low: 0.32,
};

const priorityColor: Record<Priority, string> = {
  critical: "#e11d48",
  high: "#ea580c",
  medium: "#0d9488",
  low: "#64748b",
};

function pinIcon(priority: Priority, active = false) {
  const color = priorityColor[priority];
  const size = active ? 34 : 28;
  return L.divIcon({
    className: "ux-map-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<span style="
      display:grid;place-items:center;width:${size}px;height:${size}px;
      border-radius:999px;background:${color};color:white;
      border:2px solid rgba(255,255,255,0.95);
      box-shadow:0 8px 18px rgba(15,23,42,0.28);
      font:700 10px/1 ui-sans-serif,system-ui;transform:${active ? "scale(1.08)" : "none"};
    ">●</span>`,
  });
}

type Props = {
  reports: InfrastructureReport[];
  wards: Ward[];
  showHeatmap: boolean;
  showClusters: boolean;
  showBoundaries: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

function FitAhmedabad({ reports }: { reports: InfrastructureReport[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !reports.length) return;
    fitted.current = true;
    const bounds = L.latLngBounds(
      reports.map((r) => [r.latitude, r.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.2), { animate: false, maxZoom: 13 });
  }, [map, reports]);

  return null;
}

function FlyToSelected({
  report,
}: {
  report: InfrastructureReport | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!report) return;
    map.flyTo([report.latitude, report.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.65,
    });
  }, [map, report]);
  return null;
}

function ClusterLayer({
  reports,
  enabled,
  selectedId,
  onSelect,
}: {
  reports: InfrastructureReport[];
  enabled: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let group: L.MarkerClusterGroup | null = null;

    void import("leaflet.markercluster").then(() => {
      if (cancelled) return;
      group = LL.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 52,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 16,
      });

      reports.forEach((report) => {
        const marker = L.marker([report.latitude, report.longitude], {
          icon: pinIcon(report.priority, report.id === selectedId),
        });
        marker.bindPopup(
          `<div style="min-width:180px">
            <strong>${report.title}</strong><br/>
            <span style="color:#64748b">${report.ward} · ${report.priority}</span><br/>
            <span>${report.address}</span>
          </div>`
        );
        marker.on("click", () => onSelect?.(report.id));
        group?.addLayer(marker);
      });

      if (group) map.addLayer(group);
    });

    return () => {
      cancelled = true;
      if (group) map.removeLayer(group);
    };
  }, [map, reports, enabled, selectedId, onSelect]);

  return null;
}

/** Density-aware heat layer — works even with a small Ahmedabad ticket set. */
function HeatLayer({
  reports,
  enabled,
}: {
  reports: InfrastructureReport[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || typeof LL.heatLayer !== "function") return;

    // Amplify sparse civic points so heat reads clearly at city zoom.
    const points: HeatLatLng[] = [];
    for (const r of reports) {
      const base = priorityWeight[r.priority];
      points.push([r.latitude, r.longitude, base]);
      // Soft halo samples for visible density without fake tickets
      const jitter = r.priority === "critical" ? 0.0022 : 0.0014;
      points.push([r.latitude + jitter, r.longitude, base * 0.55]);
      points.push([r.latitude, r.longitude + jitter, base * 0.55]);
      if (r.priority === "critical" || r.priority === "high") {
        points.push([r.latitude - jitter * 0.7, r.longitude - jitter * 0.7, base * 0.4]);
      }
    }

    if (!points.length) return;

    const layer = LL.heatLayer(points, {
      radius: 36,
      blur: 26,
      maxZoom: 17,
      max: 1,
      minOpacity: 0.35,
      gradient: {
        0.15: "#0f766e",
        0.35: "#14b8a6",
        0.55: "#eab308",
        0.75: "#f97316",
        0.92: "#e11d48",
      },
    });

    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, reports, enabled]);

  return null;
}

export default function EnterpriseMap({
  reports,
  wards,
  showHeatmap,
  showClusters,
  showBoundaries,
  selectedId,
  onSelect,
}: Props) {
  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId]
  );

  return (
    <MapContainer
      center={[siteConfig.mapCenter.lat, siteConfig.mapCenter.lng]}
      zoom={siteConfig.mapZoom}
      className="h-full w-full rounded-[22px]"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      <ZoomControl position="topright" />

      <FitAhmedabad reports={reports} />
      <FlyToSelected report={selected} />

      {showBoundaries &&
        wards.map((ward) => (
          <Polygon
            key={ward.id}
            positions={ward.boundary}
            pathOptions={{
              color: "#0f766e",
              weight: 1.6,
              fillColor: "#14b8a6",
              fillOpacity: 0.07,
              dashArray: "4 6",
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{ward.name}</p>
                <p>Zone: {ward.zone}</p>
                <p>Health score: {ward.healthScore}</p>
                <p>Open issues: {ward.openIssues}</p>
              </div>
            </Popup>
          </Polygon>
        ))}

      <HeatLayer reports={reports} enabled={showHeatmap} />
      <ClusterLayer
        reports={reports}
        enabled={showClusters}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      {!showClusters &&
        reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={pinIcon(report.priority, report.id === selectedId)}
            eventHandlers={{
              click: () => onSelect?.(report.id),
            }}
            opacity={showHeatmap ? 0.92 : 1}
          >
            <Popup>
              <div className="max-w-xs space-y-2 text-sm">
                <p className="font-semibold">{report.title}</p>
                <p className="text-slate-600">{report.address}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                  <Badge tone={statusTone(report.status)}>
                    {statusLabel(report.status)}
                  </Badge>
                </div>
                <a
                  className="text-teal-700 underline"
                  href={`https://www.openstreetmap.org/directions?from=&to=${report.latitude}%2C${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open route navigation
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

      {selected ? (
        <CircleMarker
          center={[selected.latitude, selected.longitude]}
          radius={22}
          pathOptions={{
            color: "#f59e0b",
            weight: 3,
            fillColor: "#fbbf24",
            fillOpacity: 0.18,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
