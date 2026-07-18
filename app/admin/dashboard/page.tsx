"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportTable } from "@/components/shared/report-table";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardStats,
  Department,
  InfrastructureReport,
  UrbanPulseMetrics,
  Ward,
} from "@/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pulse, setPulse] = useState<UrbanPulseMetrics | null>(null);
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
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
          fetch("/api/reports?stats=1", { cache: "no-store" }),
        ]);

        const analyticsJson = (await analyticsRes.json()) as {
          success: boolean;
          message?: string;
          data?: {
            stats: DashboardStats;
            urbanPulse: UrbanPulseMetrics;
            departments: Department[];
            wards: Ward[];
          };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[]; stats?: DashboardStats };
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
        setDepartments(analyticsJson.data.departments);
        setWards(analyticsJson.data.wards);
        setReports(reportsJson.data.reports);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Dashboard failed");
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
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats || !pulse) {
    return <EmptyState title="Ops dashboard unavailable" description={error ?? "No data"} />;
  }

  const criticalOpen = reports.filter(
    (r) =>
      (r.priority === "critical" || r.priority === "high") &&
      r.status !== "resolved" &&
      r.status !== "rejected"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            AMC control room
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            Operations dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Live intake across Ahmedabad wards — triage critical underpass flooding,
            SG Highway pavement failures, and ward health scores.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/priority">
            <Button variant="outline">Priority queue</Button>
          </Link>
          <Link href="/admin/reports">
            <Button>All reports</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total reports" value={stats.totalReports} hint="Citywide seed + live" />
        <StatCard label="Open" value={stats.openReports} hint="In AMC workflow" />
        <StatCard label="Resolved" value={stats.resolvedReports} hint="Closed tickets" />
        <StatCard
          label="Urban Pulse"
          value={pulse.urbanPulseIndex}
          hint={`Infra health ${pulse.infrastructureHealth}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Weekly intake</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Priority attention</CardTitle>
            <Link href="/admin/priority" className="text-sm font-medium text-teal-700 hover:underline">
              Open queue
            </Link>
          </CardHeader>
          <CardContent>
            {criticalOpen.length === 0 ? (
              <p className="text-sm text-slate-500">No critical/high open tickets.</p>
            ) : (
              <ReportTable reports={criticalOpen.slice(0, 6)} hrefBase="/admin/reports" />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Top stressed wards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...wards]
                .sort((a, b) => a.healthScore - b.healthScore)
                .slice(0, 5)
                .map((ward) => (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{ward.name}</p>
                      <p className="text-xs text-slate-500">{ward.zone} zone</p>
                    </div>
                    <p className="font-semibold text-teal-800">{ward.healthScore}</p>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Department load</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {departments.slice(0, 4).map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">{dept.name}</span>
                  <span className="font-semibold text-slate-900">
                    {dept.openIssues} open
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
