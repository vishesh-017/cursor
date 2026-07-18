"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { MapFiltersBar, useMapFilterState } from "@/components/map/map-filters";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, Ward } from "@/types";

const EnterpriseMap = dynamic(() => import("@/components/map/enterprise-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600">
      Loading Ahmedabad GIS canvas…
    </div>
  ),
});

export default function MapPage() {
  const filters = useMapFilterState();
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [reportsRes, metaRes] = await Promise.all([
          fetch("/api/reports", { cache: "no-store" }),
          fetch("/api/meta", { cache: "no-store" }),
        ]);
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          data?: { reports: InfrastructureReport[] };
        };
        const metaJson = (await metaRes.json()) as {
          success: boolean;
          data?: { wards: Ward[] };
        };
        if (reportsJson.success && reportsJson.data) {
          setReports(reportsJson.data.reports);
        }
        if (metaJson.success && metaJson.data) {
          setWards(metaJson.data.wards);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const q = filters.query.toLowerCase();
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.ward.toLowerCase().includes(q);
      const matchesCategory = !filters.category || r.category === filters.category;
      const matchesPriority = !filters.priority || r.priority === filters.priority;
      return matchesQuery && matchesCategory && matchesPriority;
    });
  }, [reports, filters.query, filters.category, filters.priority]);

  const openStatuses = new Set([
    "submitted",
    "acknowledged",
    "assigned",
    "in_progress",
  ]);

  const nearby = useMemo(() => {
    if (!selectedId) return [];
    const selected = reports.find((r) => r.id === selectedId);
    if (!selected) return [];
    return reports
      .filter((r) => r.id !== selectedId)
      .map((r) => ({
        ...r,
        distanceKm: Number(
          (
            Math.hypot(r.latitude - selected.latitude, r.longitude - selected.longitude) *
            111
          ).toFixed(2)
        ),
      }))
      .filter((r) => r.distanceKm < 3)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [reports, selectedId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Ahmedabad enterprise GIS
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Interactive issue markers, ward boundaries, clustered pins, heatmaps,
          live statistics, nearby issues, and OpenStreetMap route navigation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mapped issues" value={filtered.length} />
        <StatCard
          label="Critical"
          value={filtered.filter((r) => r.priority === "critical").length}
        />
        <StatCard
          label="Open"
          value={filtered.filter((r) => openStatuses.has(r.status)).length}
        />
      </div>

      <MapFiltersBar
        {...filters}
        stats={{
          total: filtered.length,
          critical: filtered.filter((r) => r.priority === "critical").length,
          open: filtered.filter((r) => openStatuses.has(r.status)).length,
        }}
      />

      {loading ? (
        <Skeleton className="h-[560px] w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="h-[560px] overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <EnterpriseMap
              reports={filtered}
              wards={wards}
              showHeatmap={filters.showHeatmap}
              showClusters={filters.showClusters}
              showBoundaries={filters.showBoundaries}
              selectedId={selectedId}
            />
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Issue list
            </h2>
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {filtered.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedId === report.id
                      ? "border-teal-600 bg-teal-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-medium text-slate-900">{report.title}</p>
                  <p className="text-xs text-slate-500">
                    {report.ward} · {report.priority}
                  </p>
                </button>
              ))}
            </div>
            {selectedId ? (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nearby within 3 km
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {nearby.length ? (
                    nearby.map((n) => (
                      <li key={n.id}>
                        {n.title} · {n.distanceKm} km
                      </li>
                    ))
                  ) : (
                    <li>No nearby issues in radius.</li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
