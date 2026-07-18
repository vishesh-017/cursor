"use client";

import { useState } from "react";

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
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SG Highway, Maninagar, pothole…"
          className="h-11 rounded-md border border-slate-300 px-3 text-sm md:col-span-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
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
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
        >
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
            />
            Clusters
          </label>
          <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
            Heatmap
          </label>
          <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
            <input
              type="checkbox"
              checked={showBoundaries}
              onChange={(e) => setShowBoundaries(e.target.checked)}
            />
            Ward boundaries
          </label>
        </div>
        <div className="flex gap-3 text-xs font-semibold text-slate-600">
          <span>{stats.total} mapped</span>
          <span className="text-rose-700">{stats.critical} critical</span>
          <span className="text-teal-700">{stats.open} open</span>
        </div>
      </div>
    </div>
  );
}

export function useMapFilterState() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
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
