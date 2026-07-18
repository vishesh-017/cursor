import { listReports } from "@/services/store";
import type {
  AiAnalysis,
  AuthenticityVerdict,
  DepartmentId,
  InfrastructureReport,
} from "@/types";

export type FraudRiskLevel = "low" | "watch" | "high" | "critical";

export type FraudReportRow = {
  id: string;
  title: string;
  ward: string;
  citizenId: string;
  citizenName: string;
  departmentId: DepartmentId;
  category: string;
  status: string;
  authenticity: AuthenticityVerdict;
  authenticityScore: number;
  /** 0–100: how strongly AI flags this as fraudulent / staged. */
  fraudScore: number;
  risk: FraudRiskLevel;
  confidence: number;
  imageRelevant?: string;
  reasons: string[];
  createdAt: string;
};

export type FraudOpsSummary = {
  scanned: number;
  highRisk: number;
  watchlist: number;
  avgFraudScore: number;
  topWards: Array<{ ward: string; count: number }>;
  aiBrief: string;
  reports: FraudReportRow[];
};

/** Convert Exa authenticity into an officer-facing fraud score (0–100). */
export function computeFraudScore(ai: AiAnalysis): number {
  if (ai.authenticity === "possibly_fake") {
    return Math.round(Math.min(98, 55 + ai.authenticityScore * 45));
  }
  if (ai.authenticity === "uncertain") {
    return Math.round(28 + ai.authenticityScore * 35);
  }
  // likely_true — residual fraud risk when confidence is weak
  return Math.round(Math.max(4, (1 - ai.authenticityScore) * 40));
}

export function fraudRiskLevel(score: number): FraudRiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "watch";
  return "low";
}

function fraudReasons(report: InfrastructureReport, score: number): string[] {
  const reasons: string[] = [];
  const ai = report.ai;
  if (!ai) return ["No AI triage yet"];

  if (ai.authenticity === "possibly_fake") {
    reasons.push("Exa authenticity marked possibly fake");
  } else if (ai.authenticity === "uncertain") {
    reasons.push("Authenticity uncertain — needs officer review");
  }
  if (ai.imageRelevant === "not_relevant") {
    reasons.push("Photo not relevant to civic infrastructure");
  } else if (ai.imageRelevant === "uncertain") {
    reasons.push("Photo relevance unclear");
  }
  if (ai.confidence < 0.55) {
    reasons.push("Low overall triage confidence");
  }
  if (score >= 70 && /selfie|stock|random|test|fake|spam/i.test(report.description)) {
    reasons.push("Description contains spam / test language");
  }
  if (!reasons.length && score >= 35) {
    reasons.push("Elevated residual fraud signal from model scores");
  }
  return reasons;
}

export function toFraudRow(report: InfrastructureReport): FraudReportRow | null {
  if (!report.ai) return null;
  const fraudScore = computeFraudScore(report.ai);
  return {
    id: report.id,
    title: report.title,
    ward: report.ward,
    citizenId: report.citizenId,
    citizenName: report.citizenName,
    departmentId: report.departmentId,
    category: report.category,
    status: report.status,
    authenticity: report.ai.authenticity,
    authenticityScore: report.ai.authenticityScore,
    fraudScore,
    risk: fraudRiskLevel(fraudScore),
    confidence: report.ai.confidence,
    imageRelevant: report.ai.imageRelevant,
    reasons: fraudReasons(report, fraudScore),
    createdAt: report.createdAt,
  };
}

export async function buildFraudOpsSummary(
  limit = 24
): Promise<FraudOpsSummary> {
  const all = await listReports();
  const withAi = all.filter((r) => r.ai);
  const rows = withAi
    .map(toFraudRow)
    .filter((r): r is FraudReportRow => Boolean(r))
    .sort((a, b) => b.fraudScore - a.fraudScore);

  const watch = rows.filter((r) => r.fraudScore >= 35);
  const highRisk = rows.filter((r) => r.fraudScore >= 60);
  const avg =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((s, r) => s + r.fraudScore, 0) / rows.length);

  const wardMap = new Map<string, number>();
  for (const r of highRisk) {
    wardMap.set(r.ward, (wardMap.get(r.ward) ?? 0) + 1);
  }
  const topWards = Array.from(wardMap.entries())
    .map(([ward, count]) => ({ ward, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const aiBrief =
    highRisk.length === 0
      ? "Exa scanned the inbox — no high fraud-risk tickets right now. Keep authenticity triage on for new photo reports."
      : `AI flagged ${highRisk.length} high fraud-risk ticket${highRisk.length === 1 ? "" : "s"} (score ≥60). ${
          topWards[0]
            ? `Hottest ward: ${topWards[0].ward} (${topWards[0].count}). `
            : ""
        }Use Reduce score when an officer confirms a report is genuine, or Flag citizen when it stays fake.`;

  return {
    scanned: withAi.length,
    highRisk: highRisk.length,
    watchlist: watch.length,
    avgFraudScore: avg,
    topWards,
    aiBrief,
    reports: rows.slice(0, limit),
  };
}

/**
 * Lower the fraud score by reducing model “possibly fake” confidence
 * and softening the authenticity verdict when appropriate.
 */
export function applyFraudScoreReduction(
  ai: AiAnalysis,
  reduceBy: number
): AiAnalysis {
  const amount = Math.max(5, Math.min(40, reduceBy));
  const current = computeFraudScore(ai);
  const target = Math.max(5, current - amount);

  // Soften authenticity toward trust as fraud score drops
  let authenticity: AuthenticityVerdict = ai.authenticity;
  let authenticityScore = ai.authenticityScore;

  if (target < 35) {
    authenticity = "likely_true";
    authenticityScore = Math.min(0.95, 0.72 + (35 - target) / 100);
  } else if (target < 60) {
    authenticity = "uncertain";
    authenticityScore = Math.min(0.85, 0.55 + (60 - target) / 120);
  } else {
    authenticity = "possibly_fake";
    // For possibly_fake: fraud ≈ 55 + authScore*45 → authScore = (fraud-55)/45
    authenticityScore = Math.max(0.35, Math.min(0.95, (target - 55) / 45));
  }

  const confidence = Math.min(
    0.92,
    Math.max(ai.confidence, authenticity === "likely_true" ? 0.7 : ai.confidence)
  );

  return {
    ...ai,
    authenticity,
    authenticityScore: Number(authenticityScore.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    priorityScore: Math.min(
      100,
      authenticity === "likely_true"
        ? Math.max(ai.priorityScore, 55)
        : ai.priorityScore
    ),
    summary: `${ai.summary} Officer reduced fraud score (−${amount}) → ~${target}.`,
  };
}
