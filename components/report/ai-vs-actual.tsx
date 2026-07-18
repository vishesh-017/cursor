"use client";

import type { ReactNode } from "react";
import { CheckCircle2, GitCompareArrows, Sparkles, XCircle } from "lucide-react";
import { Badge, priorityTone } from "@/components/ui/badge";
import { ConfidenceMeter } from "@/components/ui/progress";
import type { DepartmentId, InfrastructureReport, Priority } from "@/types";
import { riskLabel } from "@/utils/risk";

function deptLabel(id: DepartmentId): string {
  return id.replace("-", " ");
}

function Row({
  label,
  ai,
  actual,
  match,
}: {
  label: string;
  ai: ReactNode;
  actual: ReactNode;
  match: boolean;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]/60 p-3 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          AI predicted · {label}
        </p>
        <div className="mt-1.5">{ai}</div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Actual · {label}
        </p>
        <div className="mt-1.5">{actual}</div>
      </div>
      <div className="flex items-center sm:justify-end">
        {match ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Match
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <XCircle className="h-3.5 w-3.5" />
            Differs
          </span>
        )}
      </div>
    </div>
  );
}

export function AiVsActualPanel({
  report,
  compact = false,
}: {
  report: InfrastructureReport;
  compact?: boolean;
}) {
  const ai = report.ai;

  if (!ai) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-[var(--brand)]">
          <GitCompareArrows className="h-4 w-4" />
          <p className="text-sm font-semibold">AI vs actual</p>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          No AI triage yet. Run Exa authenticity triage to generate confidence and
          risk prediction, then compare with the live AMC assignment.
        </p>
      </div>
    );
  }

  const predictedRisk = (ai.suggestedPriority || ai.severity) as Priority;
  const priorityMatch = predictedRisk === report.priority;
  const deptMatch = ai.suggestedDepartment === report.departmentId;
  const overallMatch = priorityMatch && deptMatch;

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <GitCompareArrows className="h-4 w-4" />
            <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
              AI vs actual
            </h2>
          </div>
          {!compact ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Exa risk prediction and confidence compared with the current AMC
              priority and department.
            </p>
          ) : null}
        </div>
        <Badge tone={overallMatch ? "success" : "warning"}>
          {overallMatch ? "Aligned with AI" : "Officer override"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
            AI confidence
          </div>
          <div className="mt-3">
            <ConfidenceMeter value={ai.confidence} label="Model confidence" />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Priority score {ai.priorityScore}/100 · authenticity{" "}
            {Math.round(ai.authenticityScore * 100)}%
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            AI risk call
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-[var(--foreground)]">
            {riskLabel(predictedRisk)}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Issue: {ai.issueDetected}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Row
          label="risk / priority"
          match={priorityMatch}
          ai={
            <Badge tone={priorityTone(predictedRisk)}>
              {riskLabel(predictedRisk)}
            </Badge>
          }
          actual={
            <Badge tone={priorityTone(report.priority)}>
              {riskLabel(report.priority)}
            </Badge>
          }
        />
        <Row
          label="department"
          match={deptMatch}
          ai={
            <span className="text-sm font-semibold capitalize text-[var(--foreground)]">
              {deptLabel(ai.suggestedDepartment)}
            </span>
          }
          actual={
            <span className="text-sm font-semibold capitalize text-[var(--foreground)]">
              {deptLabel(report.departmentId)}
            </span>
          }
        />
      </div>
    </div>
  );
}
