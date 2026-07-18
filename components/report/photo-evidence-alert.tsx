"use client";

import { AlertTriangle, Camera, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AiAnalysis } from "@/types";
import { cn } from "@/utils/cn";

export function evidenceRiskLevel(ai?: AiAnalysis | null): "high" | "watch" | "ok" | "none" {
  if (!ai) return "none";
  const unrelated = ai.imageRelevant === "not_relevant";
  const aiGen = ai.imageOrigin === "possibly_ai_generated";
  const watch =
    ai.imageRelevant === "uncertain" || ai.imageOrigin === "uncertain";
  if (unrelated || aiGen) return "high";
  if (watch) return "watch";
  if (ai.imageRelevant || ai.imageOrigin) return "ok";
  return "none";
}

/** Compact chips for inbox rows / headers. */
export function PhotoEvidenceChips({
  ai,
  className,
}: {
  ai?: AiAnalysis | null;
  className?: string;
}) {
  if (!ai?.imageRelevant && !ai?.imageOrigin) return null;
  const risk = evidenceRiskLevel(ai);

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {ai.imageRelevant === "not_relevant" ? (
        <Badge tone="danger" className="normal-case">
          Unrelated photo
        </Badge>
      ) : ai.imageRelevant === "uncertain" ? (
        <Badge tone="warning" className="normal-case">
          Photo unclear
        </Badge>
      ) : ai.imageRelevant === "relevant" ? (
        <Badge tone="success" className="normal-case">
          Site photo OK
        </Badge>
      ) : null}
      {ai.imageOrigin === "possibly_ai_generated" ? (
        <Badge tone="danger" className="normal-case">
          AI-generated?
        </Badge>
      ) : ai.imageOrigin === "uncertain" ? (
        <Badge tone="warning" className="normal-case">
          Origin unsure
        </Badge>
      ) : ai.imageOrigin === "likely_photo" && risk !== "high" ? (
        <Badge tone="brand" className="normal-case">
          Likely real photo
        </Badge>
      ) : null}
    </div>
  );
}

/** Full officer-facing banner when evidence is bad / suspicious. */
export function PhotoEvidenceAlert({
  ai,
  className,
}: {
  ai?: AiAnalysis | null;
  className?: string;
}) {
  const risk = evidenceRiskLevel(ai);
  if (risk === "none" || risk === "ok" || !ai) return null;

  const unrelated = ai.imageRelevant === "not_relevant";
  const aiGen = ai.imageOrigin === "possibly_ai_generated";
  const title = aiGen
    ? "Evidence may be AI-generated"
    : unrelated
      ? "Photo is not proper civic evidence"
      : "Photo evidence needs review";

  const summary = aiGen
    ? "Exa / visual scan flagged this upload as possibly synthetic or AI-made. Ask the citizen for a fresh geotagged phone photo before dispatch."
    : unrelated
      ? "The upload looks like a selfie, meme, document, or other non-site image — not usable as infrastructure evidence."
      : "Photo relevance or origin is uncertain. Verify before assigning a field crew.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border p-4 sm:p-5",
        risk === "high"
          ? "border-rose-300/80 bg-gradient-to-br from-rose-50 via-white to-amber-50/40 dark:border-rose-500/35 dark:from-rose-950/50 dark:via-[var(--surface-solid)] dark:to-amber-950/20"
          : "border-amber-300/70 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-500/10",
        className
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
            risk === "high"
              ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
              : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
          )}
        >
          {aiGen ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold text-[var(--foreground)]">
              {title}
            </p>
            <PhotoEvidenceChips ai={ai} />
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{summary}</p>
          {(ai.imageScene || ai.imageIssueHint) && (
            <p className="text-xs text-[var(--muted)]">
              <Camera className="mr-1 inline h-3.5 w-3.5" />
              Scene: {ai.imageScene ?? "—"}
              {ai.imageIssueHint ? ` · ${ai.imageIssueHint}` : ""}
            </p>
          )}
          {ai.imageWarnings?.length ? (
            <ul className="space-y-1 text-xs text-rose-900/90 dark:text-rose-100/90">
              {ai.imageWarnings.slice(0, 5).map((w) => (
                <li key={w} className="flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                  {w}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] font-medium text-[var(--muted)]">
            Suggested AMC action: hold dispatch · request re-upload · or reject /
            flag citizen if repeat abuse.
          </p>
        </div>
      </div>
    </div>
  );
}
