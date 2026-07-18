"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Layers, MapPinned, Navigation, Radar } from "lucide-react";
import { MapFiltersBar, useMapFilterState } from "@/components/map/map-filters";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, Ward } from "@/types";
import { statusLabel } from "@/utils/status";

const EnterpriseMap = dynamic(() => import("@/components/map/enterprise-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[560px] items-center justify-center rounded-[22px] border border-[var(--border)] bg-white/40 text-sm text-[var(--muted)] dark:bg-white/5">
      Loading Ahmedabad GIS canvas…
    </div>
  ),
});

export function MapWorkspace({ framed = false }: { framed?: boolean }) {
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
        r.ward.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
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

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const nearby = useMemo(() => {
    if (!selected) return [];
    return filtered
      .filter((r) => r.id !== selected.id)
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
  }, [filtered, selected]);

  const criticalCount = filtered.filter((r) => r.priority === "critical").length;
  const openCount = filtered.filter((r) => openStatuses.has(r.status)).length;

  return (
    <div
      className={
        framed
          ? "space-y-5"
          : "mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6"
      }
    >
      <PageHeader
        eyebrow="Enterprise GIS"
        title="Ahmedabad operations map"
        description="Heat density, clustered pins, ward boundaries, and live issue triage across AMC corridors."
      />

      <div className="grid gap-3 sm:grid-cols-3">
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
        <Skeleton className="h-[640px] w-full rounded-[22px]" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative h-[640px] overflow-hidden rounded-[22px] border border-[var(--border)] shadow-[var(--shadow)]">
            <EnterpriseMap
              reports={filtered}
              wards={wards}
              showHeatmap={filters.showHeatmap}
              showClusters={filters.showClusters}
              showBoundaries={filters.showBoundaries}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] max-w-[220px] rounded-2xl border border-white/50 bg-white/90 p-3 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
              <p className="font-semibold text-[var(--foreground)]">
                {filters.showHeatmap ? "Heat intensity" : "Map legend"}
              </p>
              {filters.showHeatmap ? (
                <div className="mt-2 space-y-1.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg,#0f766e,#14b8a6,#eab308,#f97316,#e11d48)",
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-[var(--muted)]">
                    <span>Low</span>
                    <span>Critical</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                    Weighted by priority · teal → rose hotspots
                  </p>
                </div>
              ) : (
                <ul className="mt-2 space-y-1 text-[10px] text-[var(--muted)]">
                  <li>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    Critical
                  </li>
                  <li>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />
                    High
                  </li>
                  <li>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-600" />
                    Medium
                  </li>
                  <li>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500" />
                    Low
                  </li>
                </ul>
              )}
            </div>
          </div>

          <aside className="glass-card flex max-h-[640px] flex-col overflow-hidden p-4">
            <div className="mb-3 border-b border-[var(--border)] pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Issue panel
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold">Live tickets</h2>
              <p className="text-xs text-[var(--muted)]">
                {filtered.length} in view · click to focus on map
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--border)] px-3 py-8 text-center text-sm text-[var(--muted)]">
                  No tickets match these filters.
                </p>
              ) : (
                filtered.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      selectedId === report.id
                        ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-sm"
                        : "border-[var(--border)] hover:border-[var(--brand)]/40 hover:bg-white/50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-snug">{report.title}</p>
                      <Badge tone={priorityTone(report.priority)}>
                        {report.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {report.ward} · {report.category}
                    </p>
                    <div className="mt-2">
                      <Badge tone={statusTone(report.status)}>
                        {statusLabel(report.status)}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>

            {selected ? (
              <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  <Navigation className="h-3 w-3" />
                  Selected · nearby 3 km
                </div>
                <p className="text-sm font-semibold">{selected.title}</p>
                <p className="text-xs text-[var(--muted)]">{selected.address}</p>
                <ul className="space-y-1.5 text-xs text-[var(--muted)]">
                  {nearby.length ? (
                    nearby.map((n) => (
                      <li key={n.id} className="flex justify-between gap-2">
                        <button
                          type="button"
                          className="truncate text-left hover:text-[var(--brand)]"
                          onClick={() => setSelectedId(n.id)}
                        >
                          {n.title}
                        </button>
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
