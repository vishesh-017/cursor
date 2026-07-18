"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BrainCircuit,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { FraudOpsSummary, FraudReportRow } from "@/lib/ai/fraud-insights";
import { cn } from "@/utils/cn";

function riskTone(risk: FraudReportRow["risk"]) {
  if (risk === "critical") return "danger" as const;
  if (risk === "high") return "warning" as const;
  if (risk === "watch") return "info" as const;
  return "success" as const;
}

type Props = {
  fraud: FraudOpsSummary;
  onUpdated: (next: FraudOpsSummary) => void;
};

export function FraudAiPanel({ fraud, onUpdated }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "watch">("high");

  const visible = fraud.reports.filter((r) => {
    if (filter === "high") return r.fraudScore >= 60;
    if (filter === "watch") return r.fraudScore >= 35;
    return true;
  });

  async function reduceScore(reportId: string, reduceBy: number) {
    setBusyId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/fraud-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reduceBy }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { before: number; after: number; fraud: FraudReportRow | null };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Could not reduce fraud score");
      }

      const { before, after, fraud: row } = json.data;
      const reports = fraud.reports
        .map((r) => (r.id === reportId && row ? row : r))
        .sort((a, b) => b.fraudScore - a.fraudScore);

      const highRisk = reports.filter((r) => r.fraudScore >= 60).length;
      const watchlist = reports.filter((r) => r.fraudScore >= 35).length;
      const avgFraudScore = reports.length
        ? Math.round(
            reports.reduce((s, r) => s + r.fraudScore, 0) / reports.length
          )
        : 0;

      onUpdated({
        ...fraud,
        reports,
        highRisk,
        watchlist,
        avgFraudScore,
        aiBrief: `Officer reduced fraud on a ticket (${before} → ${after}). ${highRisk} high-risk remain in the AI queue.`,
      });
      toast.success(`Fraud score ${before} → ${after}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reduce failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[24px] border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-teal-50/60 p-5 sm:p-6 dark:border-rose-500/20 dark:from-rose-950/40 dark:via-[var(--surface-solid)] dark:to-teal-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              Fraud & authenticity AI
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--foreground)]">
              Cut fake-report scores before they clog desks
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Exa scores each ticket for staged / spam risk. Reduce the score when
              an officer verifies it is real — that lifts queue priority again.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="min-w-[72px] rounded-2xl bg-white/80 px-3 py-3 ring-1 ring-rose-100 dark:bg-white/5 dark:ring-white/10">
              <p className="text-xl font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                {fraud.highRisk}
              </p>
              <p className="text-[10px] text-[var(--muted)]">High risk</p>
            </div>
            <div className="min-w-[72px] rounded-2xl bg-white/80 px-3 py-3 ring-1 ring-amber-100 dark:bg-white/5 dark:ring-white/10">
              <p className="text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {fraud.watchlist}
              </p>
              <p className="text-[10px] text-[var(--muted)]">Watchlist</p>
            </div>
            <div className="min-w-[72px] rounded-2xl bg-white/80 px-3 py-3 ring-1 ring-teal-100 dark:bg-white/5 dark:ring-white/10">
              <p className="text-xl font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                {fraud.avgFraudScore}
              </p>
              <p className="text-[10px] text-[var(--muted)]">City avg</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 rounded-2xl border border-teal-200/60 bg-white/70 px-4 py-3 dark:border-teal-500/20 dark:bg-teal-500/5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
          <p className="text-sm leading-relaxed text-[var(--foreground)]">
            <span className="font-semibold text-teal-800 dark:text-teal-200">
              AI brief ·{" "}
            </span>
            {fraud.aiBrief}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["high", `High risk (${fraud.highRisk})`],
            ["watch", `Watchlist (${fraud.watchlist})`],
            ["all", `All scanned (${fraud.scanned})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              filter === id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-[var(--surface-solid)] text-[var(--muted)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-solid)] px-6 py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-teal-600" />
          <h3 className="mt-3 font-display text-xl font-semibold">
            No fraud-risk tickets here
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
            Switch filter or run Exa triage on new reports to populate this queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <article
              key={row.id}
              className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-sm transition hover:border-teal-300/50 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={riskTone(row.risk)}>{row.risk} fraud</Badge>
                    <Badge tone="default">
                      {row.authenticity.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-[var(--muted)]">
                      {row.ward} · {row.citizenName}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-[var(--foreground)]">
                    {row.title}
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                    {row.reasons.slice(0, 3).map((reason) => (
                      <li key={reason}>· {reason}</li>
                    ))}
                  </ul>
                </div>

                <div className="w-full max-w-[160px] sm:w-40">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[var(--muted)]">Fraud score</span>
                    <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                      {row.fraudScore}
                    </span>
                  </div>
                  <Progress
                    value={row.fraudScore}
                    tone={
                      row.fraudScore >= 70
                        ? "danger"
                        : row.fraudScore >= 45
                          ? "warning"
                          : "brand"
                    }
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === row.id || row.fraudScore <= 10}
                  onClick={() => void reduceScore(row.id, 15)}
                >
                  {busyId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BrainCircuit className="h-3.5 w-3.5" />
                  )}
                  Reduce −15
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === row.id || row.fraudScore <= 10}
                  onClick={() => void reduceScore(row.id, 30)}
                >
                  Clear strongly −30
                </Button>
                <Link href={`/admin/reports/${row.id}`}>
                  <Button type="button" size="sm" variant="ghost">
                    Open ticket
                  </Button>
                </Link>
                <Link href={`/admin/citizens`}>
                  <Button type="button" size="sm" variant="ghost">
                    Report citizen
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
