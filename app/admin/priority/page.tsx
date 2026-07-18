"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Flame,
  ListOrdered,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  evidenceRiskLevel,
  PhotoEvidenceChips,
} from "@/components/report/photo-evidence-alert";
import { ReportTable } from "@/components/shared/report-table";
import { Badge, priorityTone, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivePoll } from "@/hooks/use-live-poll";
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

function thumb(report: InfrastructureReport) {
  return report.imageUrl || report.imageUrls?.[0] || null;
}

export default function AdminPriorityPage() {
  const [reports, setReports] = useState<InfrastructureReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveSync, setLiveSync] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
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
      setReports(json.data.reports);
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const res = await fetch("/api/db/status", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          data?: { synced?: boolean };
        };
        if (json.success && json.data?.synced) setLiveSync(true);
      } catch {
        /* ignore */
      }
    })();
  }, [load]);

  useLivePoll(() => load({ silent: true }), {
    intervalMs: 8000,
    enabled: liveSync,
  });

  const queue = useMemo(
    () =>
      sortByAiPriority(
        reports.filter(
          (r) =>
            (r.priority === "critical" ||
              r.priority === "high" ||
              (r.ai?.priorityScore ?? 0) >= 70) &&
            openStatuses.has(r.status)
        )
      ),
    [reports]
  );

  const critical = queue.filter((r) => r.priority === "critical");
  const high = queue.filter((r) => r.priority === "high");
  const evidenceRisk = queue.filter(
    (r) => evidenceRiskLevel(r.ai) === "high"
  ).length;
  const top = queue[0];
  const topScore = top ? Math.round(aiQueueScore(top)) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-[24px]" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-[24px]" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Priority queue unavailable" description={error} />;
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-slate-800/40 bg-[#0b1f24] text-white shadow-[0_20px_50px_-28px_rgba(15,80,80,0.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(45,190,170,0.35),transparent_50%),radial-gradient(ellipse_at_90%_20%,rgba(251,113,133,0.18),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:26px_26px]" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100">
              <ListOrdered className="h-3.5 w-3.5" />
              Dispatch · Exa AI ranked
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
              Priority queue
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Open critical / high tickets ordered by Exa triage score — escalate
              #1 first, then work the board.
            </p>
            {top ? (
              <p className="mt-3 text-xs text-teal-100/90">
                Next up:{" "}
                <span className="font-semibold text-white">{top.title}</span>
                <span className="text-slate-400"> · AI {topScore}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/reports">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Full inbox
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            {top ? (
              <Link href={`/admin/reports/${top.id}`}>
                <Button
                  size="sm"
                  className="h-10 rounded-xl bg-rose-400 text-slate-950 hover:bg-rose-300"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Open #1 ticket
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Queue size",
            value: queue.length,
            hint: "Open urgent",
            className:
              "border-teal-200/70 bg-gradient-to-br from-teal-50 to-white dark:border-teal-500/25 dark:from-teal-500/15 dark:to-[var(--surface-solid)]",
            valueClass: "text-teal-800 dark:text-teal-100",
          },
          {
            label: "Critical",
            value: critical.length,
            hint: "Escalate first",
            className:
              "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white dark:border-rose-500/30 dark:from-rose-500/15 dark:to-[var(--surface-solid)]",
            valueClass: "text-rose-700 dark:text-rose-200",
          },
          {
            label: "High",
            value: high.length,
            hint: "Same-day triage",
            className:
              "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white dark:border-amber-500/30 dark:from-amber-500/15 dark:to-[var(--surface-solid)]",
            valueClass: "text-amber-800 dark:text-amber-100",
          },
          {
            label: "Evidence risk",
            value: evidenceRisk,
            hint: "Unrelated / AI photo",
            className:
              "border-[var(--border)] bg-[var(--surface-solid)]",
            valueClass: "text-[var(--foreground)]",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={cn(
              "rounded-[20px] border px-4 py-3.5 shadow-sm",
              card.className
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-1 font-display text-3xl font-semibold tabular-nums",
                card.valueClass
              )}
            >
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{card.hint}</p>
          </div>
        ))}
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="Queue clear"
          description="No open critical or high priority tickets right now."
          action={
            <Link href="/admin/reports">
              <Button variant="outline">Browse full inbox</Button>
            </Link>
          }
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-solid)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-gradient-to-r from-rose-50/80 via-transparent to-teal-50/40 px-4 py-3 dark:from-rose-500/10 dark:to-teal-500/5 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
                  <Flame className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Escalation board
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    Top {Math.min(8, queue.length)} by AI dispatch score
                  </p>
                </div>
              </div>
              <Badge tone="brand">Live queue</Badge>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {queue.slice(0, 8).map((report, index) => {
                const score = Math.round(aiQueueScore(report));
                const src = thumb(report);
                const risk = evidenceRiskLevel(report.ai);
                const isTop = index === 0;

                return (
                  <li key={report.id}>
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className={cn(
                        "group flex flex-col gap-3 px-4 py-3.5 transition sm:flex-row sm:items-center sm:justify-between sm:px-5",
                        isTop
                          ? "bg-gradient-to-r from-rose-500/[0.09] via-rose-500/[0.04] to-transparent"
                          : "hover:bg-[var(--brand-soft)]/35"
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-bold tabular-nums",
                            isTop
                              ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
                              : index < 3
                                ? "bg-[var(--brand)] text-white"
                                : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]"
                          )}
                        >
                          {index + 1}
                        </span>

                        <div className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-[var(--border)] dark:bg-white/5">
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <span className="grid h-full place-items-center text-[10px] text-[var(--muted)]">
                              No photo
                            </span>
                          )}
                          {risk === "high" ? (
                            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isTop ? (
                              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-200">
                                Escalate now
                              </span>
                            ) : null}
                            <p className="truncate font-semibold capitalize text-[var(--foreground)]">
                              {report.title}
                            </p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {report.ward}
                            </span>
                            <span className="capitalize">
                              {report.departmentId.replace("-", " ")}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3 w-3" />
                              {report.assignedTo ?? "Unassigned"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {new Date(report.updatedAt).toLocaleString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                          {report.ai?.issueDetected ? (
                            <p className="mt-1 line-clamp-1 text-[11px] text-[var(--muted)]">
                              {report.ai.issueDetected}
                            </p>
                          ) : null}
                          <PhotoEvidenceChips ai={report.ai} className="mt-1.5" />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand-soft)] px-2.5 py-1.5 text-xs font-bold tabular-nums text-[var(--brand-strong)]">
                          <Sparkles className="h-3.5 w-3.5" />
                          {score}
                        </span>
                        {report.priority === "critical" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-200">
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
                        <ArrowRight className="hidden h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)] sm:block" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Full priority table
                </h2>
                <p className="text-[11px] text-[var(--muted)]">
                  Same AI order · photo risk chips · open ticket for dispatch
                </p>
              </div>
            </div>
            <ReportTable
              reports={queue}
              hrefBase="/admin/reports"
              showAiScore
              dense
            />
          </div>
        </>
      )}
    </div>
  );
}
