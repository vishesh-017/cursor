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
import { Activity, Clock3, Sparkles, TriangleAlert } from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
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
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-[18px]" />
        ))}
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
      <PageHeader
        eyebrow="Executive intelligence"
        title="Analytics"
        description="Intake trends, ward hotspots, and department throughput for Ahmedabad Municipal Corporation operations."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total reports"
          value={stats.totalReports}
          icon={Activity}
          delay={0.05}
        />
        <KpiCard
          label="Open"
          value={stats.openReports}
          icon={TriangleAlert}
          delay={0.1}
        />
        <KpiCard
          label="Critical"
          value={stats.criticalReports}
          icon={Sparkles}
          delay={0.15}
        />
        <KpiCard
          label="Avg resolution"
          value={`${pulse.avgResolutionHours}h`}
          icon={Clock3}
          hint="Citywide estimate"
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold">Weekly report intake</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Day-wise civic tickets entering AMC desks
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold">Reports by category</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Roads, drainage, lighting, and related assets
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold">Ward volume</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hotspot intensity across Ahmedabad wards
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byWard}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold">
            Department open vs resolved
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Throughput balance for municipal desks
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Ward health snapshot</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Population-weighted readiness scores for field planning
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {wards.map((ward) => (
            <div key={ward.id} className="surface-card p-4">
              <p className="font-semibold">{ward.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {ward.zone} · pop {ward.population.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--brand)]">
                {ward.healthScore}
              </p>
              <p className="text-xs text-[var(--muted)]">{ward.openIssues} open issues</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
