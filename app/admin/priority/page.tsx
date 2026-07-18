"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Flame,
  ListOrdered,
  Sparkles,
} from "lucide-react";
import { ReportTable } from "@/components/shared/report-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfrastructureReport } from "@/types";
import { aiQueueScore, sortByAiPriority } from "@/utils/ai-priority";
import { cn } from "@/utils/cn";
import { statusLabel } from "@/utils/status";

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

  const queue = sortByAiPriority(
    reports.filter(
      (r) =>
        (r.priority === "critical" ||
          r.priority === "high" ||
          (r.ai?.priorityScore ?? 0) >= 70) &&
        openStatuses.has(r.status)
    )
  );

  const critical = queue.filter((r) => r.priority === "critical");
  const high = queue.filter((r) => r.priority === "high");

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Priority queue unavailable" description={error} />;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ListOrdered className="h-4 w-4 shrink-0 text-[var(--brand)]" />
            <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
              Priority queue
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-strong)]">
              <Sparkles className="h-3 w-3" />
              AI ranked
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            High-urgency open tickets · Exa triage score for dispatch order
          </p>
        </div>
        <Link href="/admin/reports">
          <Button variant="outline" size="sm" className="h-9 rounded-xl">
            Full inbox
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Queue size"
          value={queue.length}
          hint="Open urgent tickets"
          tone="brand"
        />
        <StatCard
          label="Critical"
          value={critical.length}
          hint="Escalate first"
          tone="danger"
        />
        <StatCard
          label="High"
          value={high.length}
          hint="Same-day triage"
          tone="warning"
        />
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="Queue clear"
          description="No open critical or high priority tickets right now."
        />
      ) : (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Escalation board
                </h2>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Top {Math.min(8, queue.length)} by AI score
              </p>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {queue.slice(0, 8).map((report, index) => {
                const score = Math.round(aiQueueScore(report));
                return (
                  <li key={report.id}>
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-3.5 transition hover:bg-[var(--brand-soft)]/40 sm:flex-row sm:items-center sm:justify-between sm:px-5",
                        index === 0 && "bg-rose-500/[0.06]"
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold tabular-nums",
                            index < 3
                              ? "bg-[var(--brand)] text-white"
                              : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]"
                          )}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold capitalize text-[var(--foreground)]">
                            {report.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                            {report.ward} ·{" "}
                            {report.departmentId.replace("-", " ")} ·{" "}
                            {report.assignedTo ?? "Unassigned"}
                          </p>
                          {report.ai?.issueDetected ? (
                            <p className="mt-1 line-clamp-1 text-[11px] text-[var(--muted)]">
                              {report.ai.issueDetected}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-soft)] px-2 py-1 text-[11px] font-semibold tabular-nums text-[var(--brand-strong)]">
                          <Sparkles className="h-3 w-3" />
                          {score}
                        </span>
                        {report.priority === "critical" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </span>
                        ) : (
                          <Badge tone={priorityTone(report.priority)}>
                            {report.priority}
                          </Badge>
                        )}
                        <Badge tone={statusTone(report.status)}>
                          {statusLabel(report.status)}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <ReportTable
            reports={queue}
            hrefBase="/admin/reports"
            showAiScore
            dense
          />
        </>
      )}
    </div>
  );
}
