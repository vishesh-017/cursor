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
import type { UrbanPulseMetrics } from "@/types";

export default function AdminUrbanPulsePage() {
  const [pulse, setPulse] = useState<UrbanPulseMetrics | null>(null);
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
          data?: { urbanPulse: UrbanPulseMetrics };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Unable to load Urban Pulse");
        }
        if (active) setPulse(json.data.urbanPulse);
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
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !pulse) {
    return <EmptyState title="Urban Pulse unavailable" description={error ?? "No data"} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Urban Pulse
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Composite city vitality index for Ahmedabad — blending infrastructure
          health, department efficiency, and citizen participation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Urban Pulse Index" value={pulse.urbanPulseIndex} hint="0–100 composite" />
        <StatCard
          label="Infrastructure health"
          value={pulse.infrastructureHealth}
          hint="Asset condition score"
        />
        <StatCard
          label="Dept efficiency"
          value={`${pulse.departmentEfficiency}%`}
          hint="Throughput quality"
        />
        <StatCard
          label="Citizen participation"
          value={pulse.citizenParticipation}
          hint="Engagement index"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open issues" value={pulse.openIssues} />
        <StatCard label="Closed issues" value={pulse.closedIssues} />
        <StatCard label="Avg resolution" value={`${pulse.avgResolutionHours}h`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Monthly opened vs closed</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pulse.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" stroke="#f59e0b" strokeWidth={2.5} />
                <Line type="monotone" dataKey="closed" stroke="#0f766e" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pulse.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Ward comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pulse.wardComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" name="Health score" fill="#0f766e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="open" name="Open issues" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
