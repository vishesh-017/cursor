"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  Gauge,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
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
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ReportTable } from "@/components/shared/report-table";
import { Badge, priorityTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  const criticalOpen = useMemo(
    () =>
      reports.filter(
        (r) =>
          (r.priority === "critical" || r.priority === "high") &&
          r.status !== "resolved" &&
          r.status !== "rejected"
      ),
    [reports]
  );

  const aiCoverage = useMemo(() => {
    if (!reports.length) return 0;
    return Math.round(
      (reports.filter((r) => r.ai).length / reports.length) * 100
    );
  }, [reports]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[18px]" />
        ))}
      </div>
    );
  }

  if (error || !stats || !pulse) {
    return <EmptyState title="Ops dashboard unavailable" description={error ?? "No data"} />;
  }

  const stressedWards = [...wards]
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-slate-950 text-white shadow-[var(--shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(43,181,174,0.35),transparent_40%),radial-gradient(circle_at_88%_0%,rgba(224,138,82,0.22),transparent_34%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              Municipal command center
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              AMC operations dashboard
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Live intake across Ahmedabad wards — triage critical underpass flooding,
              SG Highway pavement failures, and ward health scores in one control room.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/priority">
                <Button className="rounded-2xl bg-teal-400 text-slate-950 hover:bg-teal-300">
                  Priority queue
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  All reports
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-slate-300">Urban Pulse</p>
              <p className="mt-2 font-display text-4xl font-semibold">
                {pulse.urbanPulseIndex}
              </p>
              <Progress value={pulse.urbanPulseIndex} className="mt-3 bg-white/10" />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-slate-300">Infra health</p>
              <p className="mt-2 font-display text-4xl font-semibold">
                {pulse.infrastructureHealth}
              </p>
              <p className="mt-3 text-xs text-teal-200">Composite city readiness</p>
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="Command KPIs"
        title="Citywide operating picture"
        description="Charts and queues sourced from /api/analytics and live report intake."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total reports"
          value={stats.totalReports}
          icon={Activity}
          hint="Citywide seed + live"
          delay={0.05}
        />
        <KpiCard
          label="Open"
          value={stats.openReports}
          icon={TriangleAlert}
          hint="In AMC workflow"
          delay={0.1}
        />
        <KpiCard
          label="Resolved"
          value={stats.resolvedReports}
          icon={Building2}
          hint="Closed tickets"
          delay={0.15}
        />
        <KpiCard
          label="AI coverage"
          value={`${aiCoverage}%`}
          icon={Sparkles}
          hint={`${pulse.avgResolutionHours}h avg resolution`}
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Gauge className="h-4 w-4" />
            <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
              Urban Pulse
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            <PulseRow label="Infrastructure health" value={pulse.infrastructureHealth} />
            <PulseRow label="Dept efficiency" value={pulse.departmentEfficiency} />
            <PulseRow label="Citizen participation" value={pulse.citizenParticipation} />
          </div>
        </div>
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Department performance</h2>
          <div className="mt-4 space-y-3">
            {departments.slice(0, 5).map((dept) => (
              <div key={dept.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{dept.name}</span>
                  <span className="text-[var(--muted)]">
                    {dept.openIssues} open · {dept.efficiency}% eff
                  </span>
                </div>
                <Progress value={dept.efficiency} tone="brand" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold">Weekly intake</h2>
          <div className="mt-4 h-72">
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
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold">Category mix</h2>
          <div className="mt-4 h-72">
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

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Priority queue preview</h2>
              <p className="text-sm text-[var(--muted)]">
                Critical / high tickets needing dispatch
              </p>
            </div>
            <Link
              href="/admin/priority"
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Open queue
            </Link>
          </div>
          {criticalOpen.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No critical/high open tickets.</p>
          ) : (
            <ReportTable reports={criticalOpen.slice(0, 6)} hrefBase="/admin/reports" />
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">Infra health · wards</h2>
            <div className="mt-4 space-y-2">
              {stressedWards.map((ward) => (
                <div
                  key={ward.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{ward.name}</p>
                    <p className="text-xs text-[var(--muted)]">{ward.zone} zone</p>
                  </div>
                  <p className="font-semibold text-[var(--brand)]">{ward.healthScore}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">AI analytics KPIs</h2>
            <div className="mt-4 space-y-3">
              {criticalOpen.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-[var(--border)] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{report.title}</p>
                    <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {report.ai
                      ? `${report.ai.detection} · ${(report.ai.confidence * 100).toFixed(0)}%`
                      : "Awaiting Exa triage"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PulseRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <Progress value={value} tone="brand" />
    </div>
  );
}
