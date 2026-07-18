import type { InfrastructureReport, Priority } from "@/types";

const priorityRank: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Composite AMC queue score (higher = handle sooner).
 * Blends Exa priorityScore with severity, authenticity risk, and confidence.
 */
export function aiQueueScore(report: InfrastructureReport): number {
  const ai = report.ai;
  if (!ai) {
    return priorityRank[report.priority] * 18;
  }

  let score = typeof ai.priorityScore === "number" ? ai.priorityScore : 50;
  score += priorityRank[ai.suggestedPriority ?? report.priority] * 6;
  score += (ai.confidence ?? 0.5) * 12;

  // Possibly-fake / uncertain authenticity should sink in the queue
  if (ai.authenticity === "possibly_fake") score -= 28;
  else if (ai.authenticity === "uncertain") score -= 12;
  else score += (ai.authenticityScore ?? 0.5) * 8;

  if (ai.imageOrigin === "possibly_ai_generated") score -= 24;
  else if (ai.imageOrigin === "uncertain") score -= 10;
  if (ai.imageRelevant === "not_relevant") score -= 18;
  else if (ai.imageRelevant === "relevant")
    score += (ai.imageRelevanceScore ?? 0.5) * 6;

  // Closed tickets sink below open work
  if (report.status === "resolved" || report.status === "rejected") {
    score -= 80;
  }

  return Number(score.toFixed(1));
}

export function sortByAiPriority(
  reports: InfrastructureReport[]
): InfrastructureReport[] {
  return [...reports].sort((a, b) => {
    const diff = aiQueueScore(b) - aiQueueScore(a);
    if (diff !== 0) return diff;
    return +new Date(b.updatedAt) - +new Date(a.updatedAt);
  });
}
