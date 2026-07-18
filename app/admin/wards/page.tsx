"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport, Ward } from "@/types";

export default function AdminWardsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [metaRes, reportsRes] = await Promise.all([
          fetch("/api/meta", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);

        const metaJson = (await metaRes.json()) as {
          success: boolean;
          message?: string;
          data?: { wards: Ward[] };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };

        if (!metaRes.ok || !metaJson.success || !metaJson.data) {
          throw new Error(metaJson.message || "Unable to load wards");
        }
        if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
          throw new Error(reportsJson.message || "Unable to load reports");
        }

        if (!active) return;
        setWards(metaJson.data.wards);
        setReports(reportsJson.data.reports);
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
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Ward performance unavailable" description={error} />;
  }

  const rows = wards.map((ward) => {
    const wardReports = reports.filter((r) => r.wardId === ward.id || r.ward === ward.name);
    const open = wardReports.filter(
      (r) => r.status !== "resolved" && r.status !== "rejected"
    ).length;
    const critical = wardReports.filter((r) => r.priority === "critical").length;
    return { ...ward, liveOpen: open, critical };
  });

  const avgHealth = Math.round(
    rows.reduce((sum, w) => sum + w.healthScore, 0) / Math.max(rows.length, 1)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Ward performance
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Compare health scores and live ticket load across West, East, Central,
          and South Ahmedabad wards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Wards tracked" value={rows.length} />
        <StatCard label="Avg health score" value={avgHealth} />
        <StatCard
          label="Highest open load"
          value={
            [...rows].sort((a, b) => b.liveOpen - a.liveOpen)[0]?.name ?? "—"
          }
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Health score by ward</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((w) => ({ ward: w.name, score: w.healthScore }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((ward) => (
          <Card key={ward.id} className="glass-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{ward.name}</CardTitle>
                  <p className="text-xs text-slate-500">{ward.zone} zone</p>
                </div>
                <Badge tone={ward.healthScore >= 80 ? "success" : ward.healthScore >= 72 ? "info" : "warning"}>
                  {ward.healthScore}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Population: {ward.population.toLocaleString("en-IN")}</p>
              <p>Seed open issues: {ward.openIssues}</p>
              <p>Live open tickets: {ward.liveOpen}</p>
              <p>Critical tickets: {ward.critical}</p>
              <p className="text-xs text-slate-500">
                Center {ward.center.lat.toFixed(3)}, {ward.center.lng.toFixed(3)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
