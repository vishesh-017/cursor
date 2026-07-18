"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportTable } from "@/components/shared/report-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge, priorityTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport } from "@/types";

const openStatuses = new Set([
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
]);

export default function AdminPriorityPage() {
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/reports", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: { reports: InfrastructureReport[] };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Failed to load queue");
        }
        if (!active) return;
        setReports(json.data.reports);
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

  const queue = reports
    .filter(
      (r) =>
        (r.priority === "critical" || r.priority === "high") &&
        openStatuses.has(r.status)
    )
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      return rank[a.priority] - rank[b.priority];
    });

  const critical = queue.filter((r) => r.priority === "critical");
  const high = queue.filter((r) => r.priority === "high");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Priority queue unavailable" description={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Priority queue
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Critical and high tickets needing immediate AMC desk action — monsoon
            flooding, arterial road failures, and safety outages.
          </p>
        </div>
        <Link href="/admin/reports">
          <Button variant="outline">Full inbox</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Queue size" value={queue.length} hint="Open critical + high" />
        <StatCard label="Critical" value={critical.length} hint="Escalate first" />
        <StatCard label="High" value={high.length} hint="Same-day triage" />
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="Queue clear"
          description="No open critical or high priority tickets right now."
        />
      ) : (
        <>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Escalation board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.slice(0, 8).map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 p-4 transition hover:border-teal-300 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{report.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.ward} · {report.departmentId} ·{" "}
                      {report.assignedTo ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={priorityTone(report.priority)}>{report.priority}</Badge>
                    <Badge tone="warning">{report.status.replace("_", " ")}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <ReportTable reports={queue} hrefBase="/admin/reports" />
        </>
      )}
    </div>
  );
}
