import type {
  AiAnalysis,
  Badge,
  LeaderboardEntry,
  Priority,
  UserProfile,
} from "@/types";

/** Official Urbanexus civic points policy (single source of truth). */
export const POINTS_POLICY = {
  submitByPriority: {
    critical: 120,
    high: 80,
    medium: 50,
    low: 25,
  } as Record<Priority, number>,
  /** Extra when photo is civic-relevant (not selfie / blank). */
  photoRelevantBonus: 10,
  /** Extra when AMC marks the ticket resolved (genuine reports). */
  resolveBonus: 25,
  /** No resolve bonus / claw back submit award when rejected as fake. */
  rejectClawback: true,
  /** Cap photo bonus — never applied if photo is AI / not relevant. */
  blockPhotoBonusIf: {
    notRelevant: true,
    aiGenerated: true,
  },
} as const;

export type PointsBreakdownLine = {
  label: string;
  points: number;
};

export type PointsBreakdown = {
  total: number;
  lines: PointsBreakdownLine[];
  summary: string;
};

export function submitBasePoints(priority: Priority): number {
  return POINTS_POLICY.submitByPriority[priority] ?? 50;
}

export function computeSubmitPoints(input: {
  priority: Priority;
  ai?: AiAnalysis | null;
}): PointsBreakdown {
  const lines: PointsBreakdownLine[] = [];
  const base = submitBasePoints(input.priority);
  lines.push({
    label: `Queue entry · ${input.priority} priority`,
    points: base,
  });

  const relevant = input.ai?.imageRelevant === "relevant";
  const aiGen = input.ai?.imageOrigin === "possibly_ai_generated";
  const notRelevant = input.ai?.imageRelevant === "not_relevant";

  if (
    relevant &&
    !aiGen &&
    !notRelevant
  ) {
    lines.push({
      label: "Verified site photo bonus",
      points: POINTS_POLICY.photoRelevantBonus,
    });
  }

  const total = lines.reduce((s, l) => s + l.points, 0);
  return {
    total,
    lines,
    summary: lines.map((l) => `${l.label}: +${l.points}`).join(" · "),
  };
}

export function resolveBonusPoints(ai?: AiAnalysis | null): number {
  if (ai?.authenticity === "possibly_fake") return 0;
  if (ai?.imageOrigin === "possibly_ai_generated") return 0;
  return POINTS_POLICY.resolveBonus;
}

/** Public criteria rows for Rewards / FAQ UI. */
export function getPointsCriteriaRows(): Array<{
  event: string;
  criteria: string;
  points: string;
}> {
  return [
    {
      event: "Report submitted",
      criteria: "Critical priority (safety / major failure)",
      points: `+${POINTS_POLICY.submitByPriority.critical}`,
    },
    {
      event: "Report submitted",
      criteria: "High priority",
      points: `+${POINTS_POLICY.submitByPriority.high}`,
    },
    {
      event: "Report submitted",
      criteria: "Medium priority",
      points: `+${POINTS_POLICY.submitByPriority.medium}`,
    },
    {
      event: "Report submitted",
      criteria: "Low priority",
      points: `+${POINTS_POLICY.submitByPriority.low}`,
    },
    {
      event: "Photo bonus",
      criteria: "Clear site photo of the defect (not selfie / AI art)",
      points: `+${POINTS_POLICY.photoRelevantBonus}`,
    },
    {
      event: "Resolved by AMC",
      criteria: "Ticket closed as genuine / fixed",
      points: `+${POINTS_POLICY.resolveBonus}`,
    },
    {
      event: "Rejected / fake",
      criteria: "Spam, staged, or AI-fake evidence",
      points: "0 (submit points clawed back)",
    },
  ];
}

export function syncBadgesForPoints(
  user: UserProfile,
  catalog: Badge[]
): string[] {
  const earned = new Set(user.badges);
  for (const badge of catalog) {
    if (user.points >= badge.pointsRequired) {
      earned.add(badge.id);
    }
  }
  return Array.from(earned);
}

export function buildLeaderboardFromUsers(
  users: UserProfile[]
): LeaderboardEntry[] {
  return users
    .filter((u) => u.role === "citizen")
    .slice()
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.resolvedCount - a.resolvedCount ||
        b.reportsCount - a.reportsCount
    )
    .map((u, index) => ({
      userId: u.id,
      name: u.name,
      ward: u.ward,
      points: u.points,
      reports: u.reportsCount,
      badges: u.badges.length,
      rank: index + 1,
    }));
}

export function pointsPolicyBlurb(): string {
  return [
    "Civic points: Critical +120, High +80, Medium +50, Low +25 on submit.",
    `Clear site photo +${POINTS_POLICY.photoRelevantBonus}.`,
    `AMC resolve +${POINTS_POLICY.resolveBonus}.`,
    "Rejected / fake reports earn 0 (submit points removed).",
  ].join(" ");
}
