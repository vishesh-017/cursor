"use client";

import { useState } from "react";
import { Flame, Hexagon, Map as MapIcon } from "lucide-react";
import { cn } from "@/utils/cn";

function LayerToggle({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Flame;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-sm dark:text-teal-100"
          : "border-[var(--border)] bg-[var(--surface-solid)] text-[var(--foreground)] hover:border-[var(--brand)]/50"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function MapFiltersBar({
  query,
  setQuery,
  category,
  setCategory,
  priority,
  setPriority,
  showHeatmap,
  setShowHeatmap,
  showClusters,
  setShowClusters,
  showBoundaries,
  setShowBoundaries,
  stats,
}: {
  query: string;
  setQuery: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  showClusters: boolean;
  setShowClusters: (v: boolean) => void;
  showBoundaries: boolean;
  setShowBoundaries: (v: boolean) => void;
  stats: { total: number; critical: number; open: number };
}) {
  const field =
    "h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SG Highway, Maninagar, pothole…"
          aria-label="Search infrastructure issues"
          className={field}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className={field}
        >
          <option value="">All categories</option>
          <option value="roads">Roads</option>
          <option value="water">Water</option>
          <option value="drainage">Drainage</option>
          <option value="lighting">Lighting</option>
          <option value="waste">Waste</option>
          <option value="footpath">Footpath</option>
          <option value="other">Other</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filter by priority"
          className={field}
        >
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <LayerToggle
            active={showHeatmap}
            onClick={() => {
              const next = !showHeatmap;
              setShowHeatmap(next);
              if (next) setShowClusters(false);
            }}
            icon={Flame}
            label="Heatmap"
            hint="Priority density heat across Ahmedabad"
          />
          <LayerToggle
            active={showClusters}
            onClick={() => {
              const next = !showClusters;
              setShowClusters(next);
              if (next) setShowHeatmap(false);
            }}
            icon={Hexagon}
            label="Clusters"
            hint="Group nearby issue pins"
          />
          <LayerToggle
            active={showBoundaries}
            onClick={() => setShowBoundaries(!showBoundaries)}
            icon={MapIcon}
            label="Ward boundaries"
            hint="Show AMC ward polygons"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-[var(--surface-solid)] px-3 py-1.5 ring-1 ring-[var(--border)]">
            {stats.total} mapped
          </span>
          <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
            {stats.critical} critical
          </span>
          <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-[var(--brand-strong)] ring-1 ring-[var(--brand)]/20 dark:text-teal-100">
            {stats.open} open
          </span>
        </div>
      </div>
    </div>
  );
}

export function useMapFilterState() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showClusters, setShowClusters] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(true);
  return {
    query,
    setQuery,
    category,
    setCategory,
    priority,
    setPriority,
    showHeatmap,
    setShowHeatmap,
    showClusters,
    setShowClusters,
    showBoundaries,
    setShowBoundaries,
  };
}
