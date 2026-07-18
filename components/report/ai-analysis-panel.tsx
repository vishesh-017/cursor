"use client";

import {
  Building2,
  Clock3,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge, priorityTone } from "@/components/ui/badge";
import { ConfidenceMeter, Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiAnalysis, AuthenticityVerdict, DepartmentId, Priority } from "@/types";
import { riskLabel } from "@/utils/risk";

function imageRelevanceTone(value?: string) {
  if (value === "relevant") return "success" as const;
  if (value === "not_relevant") return "danger" as const;
  return "warning" as const;
}

const etaByPriority: Record<string, string> = {
  critical: "4–12 hours",
  high: "24–48 hours",
  medium: "3–5 days",
  low: "7–10 days",
};

const departments: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

const priorities: Priority[] = ["low", "medium", "high", "critical"];

type Props = {
  analysis: AiAnalysis | null;
  loading?: boolean;
  editable?: boolean;
  onChange?: (next: AiAnalysis) => void;
};

export function AiAnalysisPanel({
  analysis,
  loading = false,
  editable = false,
  onChange,
}: Props) {
  if (loading) {
    return (
      <div className="glass-card space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Exa AI checking authenticity, issue type, and priority…
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
          Run Exa analyze to detect if the report looks true or fake, score
          priority, and identify the infrastructure issue. You can also type
          these values yourself — no AI required.
        </p>
      </div>
    );
  }

  function patch(partial: Partial<AiAnalysis>) {
    if (!onChange || !analysis) return;
    onChange({ ...analysis, ...partial });
  }

  const authTone =
    analysis.authenticity === "likely_true"
      ? "success"
      : analysis.authenticity === "possibly_fake"
        ? "danger"
        : "warning";

  const predictedRisk = analysis.suggestedPriority || analysis.severity;

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--brand)]" />
            <p className="text-sm font-semibold">Exa AI risk & confidence</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={priorityTone(predictedRisk)}>
              {riskLabel(predictedRisk)}
            </Badge>
            <Badge tone={authTone}>
              {analysis.authenticity.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <ConfidenceMeter
            value={analysis.confidence}
            label="AI confidence score"
          />
          <ConfidenceMeter
            value={analysis.authenticityScore}
            label="True / fake confidence"
          />
          {typeof analysis.imageRelevanceScore === "number" ? (
            <ConfidenceMeter
              value={analysis.imageRelevanceScore}
              label="Photo relevance to Urbanexus"
            />
          ) : null}
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">AI priority score</span>
              <span className="font-semibold tabular-nums">
                {analysis.priorityScore}/100 · {riskLabel(predictedRisk)}
              </span>
            </div>
            <Progress
              value={analysis.priorityScore}
              tone={
                analysis.priorityScore >= 85
                  ? "danger"
                  : analysis.priorityScore >= 65
                    ? "warning"
                    : "brand"
              }
            />
          </div>
        </div>
      </div>

      {analysis.imageRelevant ? (
        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">AI photo scan</p>
            <Badge tone={imageRelevanceTone(analysis.imageRelevant)}>
              {analysis.imageRelevant.replace("_", " ")}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-[var(--muted)]">Scene · </span>
              {analysis.imageScene ?? "—"}
            </p>
            <p>
              <span className="text-[var(--muted)]">Dept from photo · </span>
              <span className="capitalize">
                {analysis.imageDepartmentHint?.replace("-", " ") ?? "—"}
              </span>
            </p>
            <p className="sm:col-span-2">
              <span className="text-[var(--muted)]">Issue in frame · </span>
              {analysis.imageIssueHint ?? "—"}
            </p>
            {analysis.imageNotes ? (
              <p className="sm:col-span-2 text-xs text-[var(--muted)]">
                {analysis.imageNotes}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {editable && onChange ? (
        <div className="glass-card space-y-3 p-5">
          <p className="text-sm font-semibold">Edit AI fields (optional)</p>
          <p className="text-xs text-[var(--muted)]">
            Override any value Exa suggested — your edits are saved with the report.
          </p>

          <div className="space-y-2">
            <Label htmlFor="issueDetected">Issue detected</Label>
            <Input
              id="issueDetected"
              value={analysis.issueDetected}
              onChange={(e) => patch({ issueDetected: e.target.value })}
              placeholder="e.g. Deep pothole on SG Highway service road"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="authenticity">Authenticity</Label>
              <select
                id="authenticity"
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm"
                value={analysis.authenticity}
                onChange={(e) =>
                  patch({ authenticity: e.target.value as AuthenticityVerdict })
                }
              >
                <option value="likely_true">Likely true</option>
                <option value="uncertain">Uncertain</option>
                <option value="possibly_fake">Possibly fake</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="authScore">True/fake confidence %</Label>
              <Input
                id="authScore"
                type="number"
                min={0}
                max={100}
                value={Math.round(analysis.authenticityScore * 100)}
                onChange={(e) =>
                  patch({
                    authenticityScore: Math.min(
                      1,
                      Math.max(0, Number(e.target.value) / 100)
                    ),
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priorityScore">Priority score (0–100)</Label>
              <Input
                id="priorityScore"
                type="number"
                min={0}
                max={100}
                value={analysis.priorityScore}
                onChange={(e) => {
                  const priorityScore = Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0)
                  );
                  const suggestedPriority =
                    priorityScore >= 85
                      ? "critical"
                      : priorityScore >= 65
                        ? "high"
                        : priorityScore >= 40
                          ? "medium"
                          : "low";
                  patch({ priorityScore, suggestedPriority, severity: suggestedPriority });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestedPriority">Priority label</Label>
              <select
                id="suggestedPriority"
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm"
                value={analysis.suggestedPriority}
                onChange={(e) => {
                  const suggestedPriority = e.target.value as Priority;
                  const priorityScore =
                    suggestedPriority === "critical"
                      ? 92
                      : suggestedPriority === "high"
                        ? 74
                        : suggestedPriority === "medium"
                          ? 52
                          : 28;
                  patch({
                    suggestedPriority,
                    severity: suggestedPriority,
                    priorityScore,
                  });
                }}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="detection">Detection</Label>
              <Input
                id="detection"
                value={analysis.detection}
                onChange={(e) => patch({ detection: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="damageClass">Damage type</Label>
              <Input
                id="damageClass"
                value={analysis.damageClass}
                onChange={(e) => patch({ damageClass: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Suggested department</Label>
            <select
              id="department"
              className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm"
              value={analysis.suggestedDepartment}
              onChange={(e) =>
                patch({ suggestedDepartment: e.target.value as DepartmentId })
              }
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d.replace("-", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">AI / officer summary</Label>
            <Textarea
              id="summary"
              value={analysis.summary}
              onChange={(e) => patch({ summary: e.target.value })}
              rows={4}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Insight
              icon={ShieldAlert}
              label="Issue detected"
              value={analysis.issueDetected}
            />
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
            <Insight
              icon={ShieldCheck}
              label="Priority score"
              value={`${analysis.priorityScore}/100`}
            />
          </div>

          <div className="glass-card p-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={priorityTone(analysis.suggestedPriority)}>
                Priority · {analysis.suggestedPriority}
              </Badge>
              <Badge tone={authTone}>
                {analysis.authenticity.replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
              {analysis.summary}
            </p>
          </div>
        </>
      )}

      {analysis.standardsNote ? (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-semibold">Exa insights · Guidelines</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {analysis.standardsNote}
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
