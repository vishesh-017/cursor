"use client";

import {
  AlertTriangle,
  Building2,
  Clock3,
  Layers3,
  MapPinned,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfidenceMeter, Progress } from "@/components/ui/progress";
import type { OpsInsight } from "@/lib/ai/ops-insights";

function riskTone(risk: OpsInsight["department"]["backlogRisk"]) {
  if (risk === "high") return "danger" as const;
  if (risk === "medium") return "warning" as const;
  return "success" as const;
}

export function OpsInsightPanel({ ops }: { ops: OpsInsight }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Clock3 className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Predicted clearance
            </p>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-[var(--foreground)]">
            {ops.predictedResolutionLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ~{ops.predictedResolutionHours}h based on {ops.department.name} speed,
            backlog, and priority
          </p>
          <div className="mt-3">
            <ConfidenceMeter value={ops.etaConfidence} label="ETA confidence" />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Building2 className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Department pulse
            </p>
          </div>
          <p className="mt-2 font-display text-xl font-semibold capitalize text-[var(--foreground)]">
            {ops.department.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={riskTone(ops.department.backlogRisk)}>
              {ops.department.backlogRisk} backlog
            </Badge>
            <Badge tone="brand">{ops.department.efficiency}% efficiency</Badge>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {ops.department.liveOpen} live open · avg{" "}
            {ops.department.avgResolutionHours}h · {ops.department.performanceLabel}
          </p>
          <Progress
            value={ops.department.efficiency}
            className="mt-3"
            tone={
              ops.department.efficiency >= 85
                ? "success"
                : ops.department.efficiency >= 75
                  ? "brand"
                  : "warning"
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Layers3 className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Issue cluster
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {ops.similarOpenCount}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{ops.clusterNote}</p>
          {ops.similarTitles.length ? (
            <ul className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
              {ops.similarTitles.map((title) => (
                <li key={title} className="truncate">
                  · {title}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <MapPinned className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Ward pressure
            </p>
          </div>
          <p className="mt-2 font-display text-xl font-semibold text-[var(--foreground)]">
            {ops.ward.name}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Health {ops.ward.healthScore} · {ops.ward.openIssues} open tickets
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">{ops.ward.pressureNote}</p>
        </div>
      </div>

      {ops.safetyFlags.length ? (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4" />
            <p className="text-sm font-semibold">Safety / urgency signals</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90 dark:text-amber-100/90">
            {ops.safetyFlags.map((flag) => (
              <li key={flag} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 text-[var(--brand)]">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Recommended AMC action
          </p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {ops.recommendedAction}
        </p>
      </div>
    </div>
  );
}
