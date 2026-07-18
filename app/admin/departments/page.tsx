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
import type { Department, InfrastructureReport } from "@/types";

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
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
          data?: { departments: Department[] };
        };
        const reportsJson = (await reportsRes.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };

        if (!metaRes.ok || !metaJson.success || !metaJson.data) {
          throw new Error(metaJson.message || "Unable to load departments");
        }
        if (!reportsRes.ok || !reportsJson.success || !reportsJson.data) {
          throw new Error(reportsJson.message || "Unable to load reports");
        }

        if (!active) return;
        setDepartments(metaJson.data.departments);
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
    return <EmptyState title="Departments unavailable" description={error} />;
  }

  const avgEfficiency = Math.round(
    departments.reduce((sum, d) => sum + d.efficiency, 0) /
      Math.max(departments.length, 1)
  );

  const chartData = departments.map((d) => ({
    name: d.id,
    open: d.openIssues,
    efficiency: d.efficiency,
    live: reports.filter(
      (r) =>
        r.departmentId === d.id &&
        r.status !== "resolved" &&
        r.status !== "rejected"
    ).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Departments
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          AMC departmental desks — Roads & Buildings, Water Supply, Drainage,
          Electrical, Sanitation, and Town Planning.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Departments" value={departments.length} />
        <StatCard label="Avg efficiency" value={`${avgEfficiency}%`} />
        <StatCard
          label="Highest open load"
          value={
            [...departments].sort((a, b) => b.openIssues - a.openIssues)[0]?.name ??
            "—"
          }
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Open issues by department</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="open" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((dept) => {
          const liveOpen = reports.filter(
            (r) =>
              r.departmentId === dept.id &&
              r.status !== "resolved" &&
              r.status !== "rejected"
          ).length;
          return (
            <Card key={dept.id} className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Head: {dept.head}</p>
                </div>
                <Badge tone={dept.efficiency >= 90 ? "success" : "brand"}>
                  {dept.efficiency}% efficient
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Seed open</p>
                  <p className="text-xl font-semibold text-[var(--foreground)]">
                    {dept.openIssues}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Live open</p>
                  <p className="text-xl font-semibold text-[var(--foreground)]">{liveOpen}</p>
                </div>
                <div>
                  <p className="text-slate-500">Resolved</p>
                  <p className="font-semibold text-[var(--foreground)]">{dept.resolvedIssues}</p>
                </div>
                <div>
                  <p className="text-slate-500">Avg resolution</p>
                  <p className="font-semibold text-[var(--foreground)]">
                    {dept.avgResolutionHours}h
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
