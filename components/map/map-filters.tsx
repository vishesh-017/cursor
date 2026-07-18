"use client";

import { useState } from "react";
import { Flame, Hexagon, Map as MapIcon, Search } from "lucide-react";
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
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
        active
          ? "border-transparent bg-[var(--brand)] text-white shadow-sm"
          : "border-[var(--border)] bg-[var(--surface-solid)] text-[var(--foreground)] hover:border-[var(--brand)]/40"
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
}) {
  const field =
    "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SG Highway, Maninagar, pothole…"
          aria-label="Search infrastructure issues"
          className={cn(field, "pl-9")}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className={cn(field, "sm:w-[9.5rem]")}
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
          className={cn(field, "sm:w-[9rem]")}
        >
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:ml-1">
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
            label="Wards"
            hint="Show AMC ward polygons"
          />
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
