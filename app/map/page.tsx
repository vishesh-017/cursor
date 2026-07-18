"use client";

import { CityMapLoader } from "@/components/map/city-map-loader";
import { useReports } from "@/hooks/use-reports";

export default function MapPage() {
  const { data, loading, error } = useReports();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Ahmedabad infrastructure map
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Live issue markers across AMC wards on OpenStreetMap. Click a pin for
          category, priority, and ward context.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading reports…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && <CityMapLoader reports={data.reports} />}
    </div>
  );
}
