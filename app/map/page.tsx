"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Layers, MapPinned, Radar } from "lucide-react";
import { MapFiltersBar, useMapFilterState } from "@/components/map/map-filters";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, priorityTone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, Ward } from "@/types";

const EnterpriseMap = dynamic(() => import("@/components/map/enterprise-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-white/40 text-sm text-[var(--muted)] dark:bg-white/5">
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

  const criticalCount = filtered.filter((r) => r.priority === "critical").length;
  const openCount = filtered.filter((r) => openStatuses.has(r.status)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Enterprise GIS"
        title="Ahmedabad operations map"
        description="Interactive issue markers, ward boundaries, clustered pins, heatmaps, live statistics, nearby issues, and OpenStreetMap route navigation."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Mapped issues"
          value={filtered.length}
          icon={MapPinned}
          delay={0.05}
        />
        <KpiCard
          label="Critical"
          value={criticalCount}
          icon={Radar}
          delay={0.1}
        />
        <KpiCard label="Open" value={openCount} icon={Layers} delay={0.15} />
      </div>

      <div className="glass-card p-4 sm:p-5">
        <MapFiltersBar
          {...filters}
          stats={{
            total: filtered.length,
            critical: criticalCount,
            open: openCount,
          }}
        />
      </div>

      {loading ? (
        <Skeleton className="h-[560px] w-full rounded-[22px]" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="h-[560px] overflow-hidden rounded-[22px] border border-[var(--border)] shadow-[var(--shadow)]">
            <EnterpriseMap
              reports={filtered}
              wards={wards}
              showHeatmap={filters.showHeatmap}
              showClusters={filters.showClusters}
              showBoundaries={filters.showBoundaries}
              selectedId={selectedId}
            />
          </div>

          <aside className="glass-card flex max-h-[560px] flex-col p-4">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Operations sidebar
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold">Issue list</h2>
              <p className="text-xs text-[var(--muted)]">
                {filtered.length} tickets in current filter set
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filtered.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    selectedId === report.id
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : "border-[var(--border)] hover:bg-white/50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{report.title}</p>
                    <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {report.ward} · {report.category}
                  </p>
                </button>
              ))}
            </div>
            {selectedId ? (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Nearby within 3 km
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-[var(--muted)]">
                  {nearby.length ? (
                    nearby.map((n) => (
                      <li key={n.id} className="flex justify-between gap-2">
                        <span className="truncate">{n.title}</span>
                        <span className="shrink-0 tabular-nums">{n.distanceKm} km</span>
                      </li>
                    ))
                  ) : (
                    <li>No nearby issues in radius.</li>
                  )}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
