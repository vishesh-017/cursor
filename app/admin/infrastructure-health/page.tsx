"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Badge, priorityTone } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardStats,
  InfrastructureReport,
  UrbanPulseMetrics,
  Ward,
} from "@/types";

export default function AdminInfrastructureHealthPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pulse, setPulse] = useState<UrbanPulseMetrics | null>(null);
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
        const [analyticsRes, reportsRes] = await Promise.all([
          fetch("/api/analytics", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);

        const analyticsJson = (await analyticsRes.json()) as {
          success: boolean;
          message?: string;
          data?: {
            stats: DashboardStats;
            urbanPulse: UrbanPulseMetrics;
            wards: Ward[];
          };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };

        if (!analyticsRes.ok || !analyticsJson.success || !analyticsJson.data) {
          throw new Error(analyticsJson.message || "Analytics failed");
        }
        if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
          throw new Error(reportsJson.message || "Reports failed");
        }

        if (!active) return;
        setStats(analyticsJson.data.stats);
        setPulse(analyticsJson.data.urbanPulse);
        setWards(analyticsJson.data.wards);
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

  const categoryRisk = useMemo(() => {
    return (stats?.byCategory ?? []).map((row) => {
      const openCritical = reports.filter(
        (r) =>
          r.category === row.category &&
          (r.priority === "critical" || r.priority === "high") &&
          r.status !== "resolved" &&
          r.status !== "rejected"
      ).length;
      return { category: row.category, total: row.count, risk: openCritical };
    });
  }, [stats, reports]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !stats || !pulse) {
    return (
      <EmptyState title="Infrastructure health unavailable" description={error ?? "No data"} />
    );
  }

  const weakest = [...wards].sort((a, b) => a.healthScore - b.healthScore).slice(0, 3);
  const stressed = reports
    .filter(
      (r) =>
        (r.priority === "critical" || r.priority === "high") &&
        r.status !== "resolved" &&
        r.status !== "rejected"
    )
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Infrastructure health
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Asset-condition view for roads, drainage, lighting, and water networks
          across Ahmedabad wards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="City health score"
          value={pulse.infrastructureHealth}
          hint="Composite condition index"
        />
        <StatCard label="Open defects" value={pulse.openIssues} />
        <StatCard label="Critical open" value={stats.criticalReports} />
        <StatCard
          label="Weakest ward"
          value={weakest[0]?.name ?? "—"}
          hint={weakest[0] ? `Score ${weakest[0].healthScore}` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Category risk (high/critical open)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="risk" fill="#be123c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Ward health scores</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wards.map((w) => ({ ward: w.name, score: w.healthScore }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Priority defects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stressed.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border border-slate-200 bg-white/70 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{report.title}</p>
                  <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {report.ward} · {report.category} · {report.status.replace("_", " ")}
                </p>
              </div>
            ))}
            {stressed.length === 0 ? (
              <p className="text-sm text-slate-500">No high-priority open defects.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Wards needing attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakest.map((ward) => (
              <div
                key={ward.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">{ward.name}</p>
                  <p className="text-xs text-slate-500">
                    {ward.zone} zone · {ward.openIssues} open
                  </p>
                </div>
                <p className="text-xl font-semibold text-rose-700">{ward.healthScore}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
