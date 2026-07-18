"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  Polygon,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { siteConfig } from "@/config/site";
import type { InfrastructureReport, Ward } from "@/types";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  reports: InfrastructureReport[];
  wards: Ward[];
  showHeatmap: boolean;
  showClusters: boolean;
  showBoundaries: boolean;
  selectedId?: string | null;
};

function ClusterLayer({
  reports,
  enabled,
}: {
  reports: InfrastructureReport[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    let group: L.MarkerClusterGroup | null = null;
    let cancelled = false;

    void import("leaflet.markercluster").then(() => {
      if (cancelled) return;
      group = (L as typeof L & { markerClusterGroup: () => L.MarkerClusterGroup }).markerClusterGroup();
      reports.forEach((report) => {
        const marker = L.marker([report.latitude, report.longitude], {
          icon: markerIcon,
        });
        marker.bindPopup(
          `<strong>${report.title}</strong><br/>${report.ward} · ${report.priority}<br/>${report.address}`
        );
        group?.addLayer(marker);
      });
      if (group) map.addLayer(group);
    });

    return () => {
      cancelled = true;
      if (group) map.removeLayer(group);
    };
  }, [map, reports, enabled]);

  return null;
}

function HeatLayer({
  reports,
  enabled,
}: {
  reports: InfrastructureReport[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    let layer: L.Layer | null = null;
    let cancelled = false;

    void import("leaflet.heat").then(() => {
      if (cancelled) return;
      const points = reports.map(
        (r) =>
          [
            r.latitude,
            r.longitude,
            r.priority === "critical" ? 1 : r.priority === "high" ? 0.75 : 0.45,
          ] as [number, number, number]
      );
      const heatFactory = (
        L as typeof L & {
          heatLayer: (
            pts: Array<[number, number, number]>,
            opts: Record<string, number>
          ) => L.Layer;
        }
      ).heatLayer;
      layer = heatFactory(points, { radius: 28, blur: 22, maxZoom: 16 });
      map.addLayer(layer);
    });

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
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
}: Props) {
  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId]
  );

  return (
    <MapContainer
      center={[siteConfig.mapCenter.lat, siteConfig.mapCenter.lng]}
      zoom={siteConfig.mapZoom}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showBoundaries &&
        wards.map((ward) => (
          <Polygon
            key={ward.id}
            positions={ward.boundary}
            pathOptions={{
              color: "#0f766e",
              weight: 1.5,
              fillColor: "#14b8a6",
              fillOpacity: 0.08,
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
      <ClusterLayer reports={reports} enabled={showClusters} />

      {!showClusters &&
        reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="max-w-xs space-y-2 text-sm">
                <p className="font-semibold">{report.title}</p>
                <p className="text-slate-600">{report.address}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                  <Badge tone={statusTone(report.status)}>
                    {report.status.replace("_", " ")}
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
          radius={18}
          pathOptions={{ color: "#f59e0b", weight: 3, fillOpacity: 0.15 }}
        />
      ) : null}
    </MapContainer>
  );
}
