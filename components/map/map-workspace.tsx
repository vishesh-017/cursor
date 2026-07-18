"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Layers,
  MapPinned,
  Navigation,
  Radar,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { MapFiltersBar, useMapFilterState } from "@/components/map/map-filters";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, Ward } from "@/types";
import { sortByAiPriority } from "@/utils/ai-priority";
import { cn } from "@/utils/cn";
import { statusLabel } from "@/utils/status";

const EnterpriseMap = dynamic(() => import("@/components/map/enterprise-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[520px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] text-sm text-[var(--muted)]">
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
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, metaRes] = await Promise.all([
        fetch("/api/reports?citywide=1", { cache: "no-store" }),
        fetch("/api/meta", { cache: "no-store" }),
      ]);
      const reportsJson = (await reportsRes.json()) as {
        success: boolean;
        message?: string;
        data?: { reports: InfrastructureReport[] };
      };
      const metaJson = (await metaRes.json()) as {
        success: boolean;
        message?: string;
        data?: { wards: Ward[] };
      };

      if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
        throw new Error(reportsJson.message || "Failed to load map tickets");
      }
      if (!metaRes.ok || !metaJson.success || !metaJson.data) {
        throw new Error(metaJson.message || "Failed to load wards");
      }

      setReports(reportsJson.data.reports);
      setWards(metaJson.data.wards);
    } catch (err) {
      setReports([]);
      setError(err instanceof Error ? err.message : "Map data unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const list = reports.filter((r) => {
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
    return sortByAiPriority(list);
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
            Math.hypot(
              r.latitude - selected.latitude,
              r.longitude - selected.longitude
            ) * 111
          ).toFixed(2)
        ),
      }))
      .filter((r) => r.distanceKm < 3)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [filtered, selected]);

  const criticalCount = filtered.filter((r) => r.priority === "critical").length;
  const openCount = filtered.filter((r) => openStatuses.has(r.status)).length;
  const filtersActive = Boolean(
    filters.query.trim() || filters.category || filters.priority
  );

  function clearFilters() {
    filters.setQuery("");
    filters.setCategory("");
    filters.setPriority("");
  }

  return (
    <div
      className={
        framed ? "space-y-3" : "mx-auto max-w-7xl space-y-3 px-4 py-6 sm:px-6"
      }
    >
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MapPinned className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
                Ahmedabad operations map
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Citywide triage · layers and filters below
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatChip label="mapped" value={filtered.length} tone="brand" />
            <StatChip label="critical" value={criticalCount} tone="danger" />
            <StatChip label="open" value={openCount} tone="neutral" />
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => void load()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <MapFiltersBar {...filters} />
        </div>
      </section>

      {error ? (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-rose-300/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Could not load map tickets</p>
            <p className="mt-0.5 break-words text-xs opacity-90">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <Skeleton className="h-[560px] w-full rounded-2xl" />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="relative h-[560px] overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow)] sm:h-[640px]">
            <EnterpriseMap
              reports={filtered}
              wards={wards}
              showHeatmap={filters.showHeatmap}
              showClusters={filters.showClusters}
              showBoundaries={filters.showBoundaries}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] max-w-[200px] rounded-xl border border-white/40 bg-white/90 p-2.5 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
              <p className="font-semibold text-[var(--foreground)]">
                {filters.showHeatmap ? "Heat intensity" : "Pin legend"}
              </p>
              {filters.showHeatmap ? (
                <div className="mt-2 space-y-1.5">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg,#0f766e,#14b8a6,#eab308,#f97316,#e11d48)",
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-[var(--muted)]">
                    <span>Low</span>
                    <span>Critical</span>
                  </div>
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
                    Medium / Low
                  </li>
                </ul>
              )}
            </div>
          </div>

          <aside className="flex max-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] sm:max-h-[640px]">
            <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-[var(--brand)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Live tickets
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand)]">
                  <Sparkles className="h-3 w-3" />
                  AI order
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {filtered.length} in view · ranked by triage score
              </p>
            </div>

            <div className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
                  <Radar className="mb-3 h-8 w-8 text-[var(--muted)]" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {reports.length === 0
                      ? "No tickets loaded"
                      : "No tickets match filters"}
                  </p>
                  <p className="mt-1 max-w-[220px] whitespace-normal break-words text-xs leading-relaxed text-[var(--muted)]">
                    {reports.length === 0
                      ? error
                        ? "Fix the load error above, then refresh the map."
                        : "Seed demo data or file a report to see pins on the map."
                      : "Try clearing search, category, or priority filters."}
                  </p>
                  {filtersActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 rounded-xl"
                      onClick={clearFilters}
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              ) : (
                filtered.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    className={cn(
                      "w-full min-w-0 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                      selectedId === report.id
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--border)] hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 break-words font-semibold leading-snug text-[var(--foreground)]">
                        {report.title}
                      </p>
                      <Badge tone={priorityTone(report.priority)}>
                        {report.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
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
              <div className="shrink-0 space-y-2 border-t border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  <Navigation className="h-3 w-3" />
                  Nearby · 3 km
                </div>
                <p className="break-words text-sm font-semibold text-[var(--foreground)]">
                  {selected.title}
                </p>
                <p className="break-words text-xs text-[var(--muted)]">
                  {selected.address}
                </p>
                <ul className="space-y-1.5 text-xs text-[var(--muted)]">
                  {nearby.length ? (
                    nearby.map((n) => (
                      <li key={n.id} className="flex justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 truncate text-left hover:text-[var(--brand)]"
                          onClick={() => setSelectedId(n.id)}
                        >
                          {n.title}
                        </button>
                        <span className="shrink-0 tabular-nums">
                          {n.distanceKm} km
                        </span>
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

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "danger" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-lg px-2.5 py-1.5 text-white shadow-sm",
        tone === "danger" && "bg-rose-600",
        tone === "brand" && "bg-[var(--brand)]",
        tone === "neutral" &&
          "border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--foreground)] shadow-none"
      )}
    >
      <span className="text-sm font-bold tabular-nums">{value}</span>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          tone === "neutral" ? "text-[var(--muted)]" : "text-white/85"
        )}
      >
        {label}
      </span>
    </span>
  );
}
