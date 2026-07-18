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
import {
  chartAxisTick,
  chartColors,
  chartTooltipStyle,
} from "@/utils/chart-theme";

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

  const categoryChart = [...stats.byCategory]
    .map((row) => ({
      ...row,
      category:
        row.category.charAt(0).toUpperCase() + row.category.slice(1).toLowerCase(),
    }))
    .sort((a, b) => b.count - a.count);

  const wardChart = [...stats.byWard].sort((a, b) => b.count - a.count);

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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Weekly report intake
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Day-wise civic tickets entering AMC desks
          </p>
          <div className="mt-4 h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weeklyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke={chartColors.brand}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartColors.brand, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Reports by category
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sorted by volume · roads, drainage, lighting, and related assets
          </p>
          <div className="mt-4 h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} barCategoryGap="28%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="category"
                  tick={{ ...chartAxisTick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: "rgba(43, 181, 174, 0.08)" }}
                />
                <Bar
                  dataKey="count"
                  fill={chartColors.brand}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Ward volume
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hotspot intensity across Ahmedabad wards
          </p>
          <div className="mt-4 h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardChart} barCategoryGap="24%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="ward"
                  tick={{ ...chartAxisTick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: "rgba(43, 181, 174, 0.08)" }}
                />
                <Bar
                  dataKey="count"
                  fill={chartColors.brandStrong}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Department open vs resolved
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Throughput balance for municipal desks
          </p>
          <div className="mt-4 h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChart} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ ...chartAxisTick, fontSize: 10 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: chartColors.tick }} />
                <Bar
                  dataKey="open"
                  fill={chartColors.accent}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="resolved"
                  fill={chartColors.brand}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
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
