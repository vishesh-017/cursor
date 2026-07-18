"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardStats,
  Department,
  UrbanPulseMetrics,
  Ward,
} from "@/types";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pulse, setPulse] = useState<UrbanPulseMetrics | null>(null);
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
        const res = await fetch("/api/analytics", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: {
            stats: DashboardStats;
            urbanPulse: UrbanPulseMetrics;
            departments: Department[];
            wards: Ward[];
          };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Analytics failed");
        }
        if (!active) return;
        setStats(json.data.stats);
        setPulse(json.data.urbanPulse);
        setDepartments(json.data.departments);
        setWards(json.data.wards);
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
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !stats || !pulse) {
    return <EmptyState title="Analytics unavailable" description={error ?? "No data"} />;
  }

  const deptChart = departments.map((d) => ({
    name: d.name.replace(" & ", "/"),
    open: d.openIssues,
    resolved: d.resolvedIssues,
    efficiency: d.efficiency,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Analytics
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Intake trends, ward hotspots, and department throughput for Ahmedabad
          Municipal Corporation operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total reports" value={stats.totalReports} />
        <StatCard label="Open" value={stats.openReports} />
        <StatCard label="Critical" value={stats.criticalReports} />
        <StatCard
          label="Avg resolution"
          value={`${pulse.avgResolutionHours}h`}
          hint="Citywide estimate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Weekly report intake</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
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
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Reports by category</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Ward volume</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byWard}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Department open vs resolved</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Ward health snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {wards.map((ward) => (
            <div
              key={ward.id}
              className="rounded-xl border border-slate-200 bg-white/70 p-4"
            >
              <p className="font-semibold text-slate-900">{ward.name}</p>
              <p className="text-xs text-slate-500">{ward.zone} · pop {ward.population.toLocaleString("en-IN")}</p>
              <p className="mt-2 text-2xl font-semibold text-teal-800">
                {ward.healthScore}
              </p>
              <p className="text-xs text-slate-500">{ward.openIssues} open issues</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
