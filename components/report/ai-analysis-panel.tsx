"use client";

import {
  Building2,
  Clock3,
  Gauge,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge, priorityTone } from "@/components/ui/badge";
import { ConfidenceMeter } from "@/components/ui/progress";
import type { AiAnalysis } from "@/types";

const etaByPriority: Record<string, string> = {
  critical: "4–12 hours",
  high: "24–48 hours",
  medium: "3–5 days",
  low: "7–10 days",
};

export function AiAnalysisPanel({
  analysis,
  loading = false,
}: {
  analysis: AiAnalysis | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="glass-card space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Exa AI analyzing Ahmedabad context…
        </div>
        <div className="space-y-3">
          <div className="h-3 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-[var(--brand)]">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm font-semibold">Exa AI triage standby</p>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Run analysis to generate damage classification, department routing,
          confidence, and municipal guideline insights for AMC officers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold">Exa AI status · Complete</p>
          </div>
          <Badge tone="brand">Live research</Badge>
        </div>
        <div className="mt-4">
          <ConfidenceMeter value={analysis.confidence} label="AI confidence" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Insight
          icon={TriangleAlert}
          label="Damage type"
          value={analysis.damageClass}
        />
        <Insight icon={Gauge} label="Detection" value={analysis.detection} />
        <Insight
          icon={Building2}
          label="Suggested department"
          value={analysis.suggestedDepartment.replace("-", " ")}
        />
        <Insight
          icon={Clock3}
          label="Est. resolution"
          value={etaByPriority[analysis.suggestedPriority] ?? "3–5 days"}
        />
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone={priorityTone(analysis.suggestedPriority)}>
            Priority · {analysis.suggestedPriority}
          </Badge>
          <Badge tone="info">Category routed</Badge>
          <Badge tone="success">AMC ready</Badge>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
          {analysis.summary}
        </p>
      </div>

      {analysis.standardsNote ? (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-semibold">Exa insights · Guidelines</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {analysis.standardsNote}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Reference context drawn from municipal / civic sources via Exa research.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Insight({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon className="h-4 w-4 text-[var(--brand)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
