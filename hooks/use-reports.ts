"use client";

import { useEffect, useState } from "react";
import type { DashboardStats, InfrastructureReport } from "@/types";

type ReportsPayload = {
  reports: InfrastructureReport[];
  stats?: DashboardStats;
};

export function useReports(includeStats = false) {
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reports${includeStats ? "?stats=1" : ""}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as {
          success: boolean;
          data?: ReportsPayload;
          message?: string;
        };
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || "Failed to load reports");
        }
        if (active) setData(payload.data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [includeStats]);

  return { data, loading, error };
}
