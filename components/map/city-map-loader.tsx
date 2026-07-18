"use client";

import dynamic from "next/dynamic";
import type { InfrastructureReport } from "@/types";

const CityMap = dynamic(() => import("@/components/map/city-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600">
      Loading Ahmedabad map…
    </div>
  ),
});

type Props = {
  reports: InfrastructureReport[];
};

export function CityMapLoader({ reports }: Props) {
  return (
    <div className="h-[520px] overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <CityMap reports={reports} />
    </div>
  );
}
