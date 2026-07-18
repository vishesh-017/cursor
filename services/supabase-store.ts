import { getDbClient } from "@/lib/db/config";
import {
  mapBadge,
  mapDepartment,
  mapLeaderboard,
  mapNotification,
  mapReport,
  mapReward,
  mapUser,
  mapWard,
  reportToRow,
  userToRow,
  type NotificationRow,
  type ReportRow,
  type UserRow,
} from "@/lib/db/mappers";
import {
  buildLeaderboardFromUsers,
  computeSubmitPoints,
  resolveBonusPoints,
  syncBadgesForPoints,
} from "@/lib/points/criteria";
import { getDashboardStats as computeStats } from "@/services/analytics";
import type {
  DepartmentRankingEntry,
  InfrastructureReport,
  ModerationAction,
  ReportStatus,
  UrbanPulseMetrics,
  UserProfile,
  WardRankingEntry,
} from "@/types";

function db() {
  const client = getDbClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

export async function dbGetUsers(): Promise<UserProfile[]> {
  const { data, error } = await db().from("users").select("*");
  if (error) throw error;
  return ((data ?? []) as UserRow[]).map(mapUser);
}

export async function dbGetUserById(
  id: string
): Promise<UserProfile | undefined> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data as UserRow) : undefined;
}

export async function dbGetUserByEmail(
  email: string
): Promise<UserProfile | undefined> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data as UserRow) : undefined;
}

export async function dbGetCitizens(): Promise<UserProfile[]> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("role", "citizen")
    .order("points", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as UserRow[]).map(mapUser);
}

export async function dbModerateUser(input: {
  userId: string;
  action: ModerationAction;
  reason: string;
  reportId?: string;
  actorId: string;
  actorName: string;
}): Promise<UserProfile | null> {
  const user = await dbGetUserById(input.userId);
  if (!user || user.role !== "citizen") return null;

  const reason = input.reason.trim();
  if (reason.length < 4) return null;

  const now = new Date().toISOString();
  let accountStatus = user.accountStatus ?? "active";
  let flagCount = user.flagCount ?? 0;

  if (input.action === "flag") {
    accountStatus = "flagged";
    flagCount += 1;
  } else if (input.action === "suspend") {
    accountStatus = "suspended";
  } else if (input.action === "remove") {
    accountStatus = "removed";
  } else if (input.action === "reinstate") {
    accountStatus = "active";
    flagCount = 0;
  }

  const patch = {
    account_status: accountStatus,
    flag_count: flagCount,
    moderation_note: reason,
    moderated_at: now,
    moderated_by: input.actorName,
  };

  const { data, error } = await db()
    .from("users")
    .update(patch)
    .eq("id", input.userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  await db().from("moderation_events").insert({
    id: `mod-${Date.now()}`,
    user_id: input.userId,
    action: input.action,
    reason,
    report_id: input.reportId ?? null,
    actor_id: input.actorId,
    actor_name: input.actorName,
    created_at: now,
  });

  await db().from("notifications").insert({
    id: `n-mod-${Date.now()}`,
    user_id: input.userId,
    title:
      input.action === "reinstate"
        ? "Account reinstated"
        : input.action === "flag"
          ? "Account flagged for review"
          : input.action === "suspend"
            ? "Account suspended"
            : "Account removed",
    body:
      input.action === "reinstate"
        ? "Your Urbanexus citizen account has been reinstated by AMC."
        : `AMC moderation (${input.action}): ${reason}`,
    created_at: now,
    read: false,
    href: "/citizen/profile",
  });

  return data ? mapUser(data as UserRow) : null;
}

export async function dbListReports(filters?: {
  citizenId?: string;
  status?: ReportStatus;
  ward?: string;
  wards?: string[];
  priority?: string;
  departmentId?: string;
  q?: string;
}): Promise<InfrastructureReport[]> {
  let query = db().from("reports").select("*").order("updated_at", {
    ascending: false,
  });

  if (filters?.citizenId) query = query.eq("citizen_id", filters.citizenId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.wards?.length) query = query.in("ward", filters.wards);
  else if (filters?.ward) query = query.ilike("ward", filters.ward);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.departmentId)
    query = query.eq("department_id", filters.departmentId);

  const { data, error } = await query;
  if (error) throw error;

  let result = ((data ?? []) as ReportRow[]).map(mapReport);

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.ward.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function dbGetReportById(id: string) {
  const { data, error } = await db()
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReport(data as ReportRow) : undefined;
}

async function dbCreditCitizen(
  userId: string,
  delta: number,
  opts?: { reportDelta?: number; resolvedDelta?: number }
) {
  if (!delta && !opts?.reportDelta && !opts?.resolvedDelta) return;
  const user = await dbGetUserById(userId);
  if (!user || user.role !== "citizen") return;

  user.points = Math.max(0, user.points + delta);
  if (opts?.reportDelta) {
    user.reportsCount = Math.max(0, user.reportsCount + opts.reportDelta);
  }
  if (opts?.resolvedDelta) {
    user.resolvedCount = Math.max(0, user.resolvedCount + opts.resolvedDelta);
  }
  const catalog = await dbGetBadges();
  user.badges = syncBadgesForPoints(user, catalog);

  const { error } = await db()
    .from("users")
    .update(userToRow(user))
    .eq("id", userId);
  if (error) throw error;

  // Keep leaderboard_entries in sync with live citizen balances
  const citizens = await dbGetCitizens();
  const board = buildLeaderboardFromUsers(citizens);
  if (board.length) {
    await db().from("leaderboard_entries").upsert(
      board.map((e) => ({
        user_id: e.userId,
        name: e.name,
        ward: e.ward,
        points: e.points,
        reports: e.reports,
        badges: e.badges,
        rank: e.rank,
      })),
      { onConflict: "user_id" }
    );
  }
}

export async function dbCreateReport(
  input: Omit<
    InfrastructureReport,
    "id" | "createdAt" | "updatedAt" | "timeline" | "pointsAwarded" | "status"
  > & { status?: ReportStatus }
): Promise<InfrastructureReport> {
  const now = new Date().toISOString();
  const breakdown = computeSubmitPoints({
    priority: input.priority,
    ai: input.ai,
  });
  const report: InfrastructureReport = {
    ...input,
    id: `rpt-${Date.now()}`,
    status: input.status ?? "submitted",
    createdAt: now,
    updatedAt: now,
    pointsAwarded: breakdown.total,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        at: now,
        title: "Report submitted",
        description: `Citizen report received via Urbanexus. Points: ${breakdown.summary}.`,
        actor: input.citizenName,
        status: "submitted",
      },
    ],
  };

  const { error } = await db().from("reports").insert(reportToRow(report));
  if (error) throw error;

  await dbCreditCitizen(input.citizenId, breakdown.total, { reportDelta: 1 });

  const notification: NotificationRow = {
    id: `n-${Date.now()}`,
    user_id: input.citizenId,
    title: "Report submitted",
    body: `Your report "${report.title}" is in the AMC queue · +${breakdown.total} civic points.`,
    created_at: now,
    read: false,
    href: `/citizen/reports/${report.id}`,
  };
  const { error: nErr } = await db().from("notifications").insert(notification);
  if (nErr) throw nErr;

  return report;
}

export async function dbUpdateReport(
  id: string,
  patch: Partial<
    Pick<
      InfrastructureReport,
      "status" | "priority" | "assignedTo" | "departmentId" | "ai"
    >
  > & { timelineNote?: string; actor?: string }
) {
  const existing = await dbGetReportById(id);
  if (!existing) return null;

  const prevStatus = existing.status;
  const now = new Date().toISOString();
  if (patch.status) existing.status = patch.status;
  if (patch.priority) existing.priority = patch.priority;
  if (patch.assignedTo !== undefined) existing.assignedTo = patch.assignedTo;
  if (patch.departmentId) existing.departmentId = patch.departmentId;
  if (patch.ai) existing.ai = patch.ai;
  existing.updatedAt = now;

  let pointsNote = "";
  if (patch.status && patch.status !== prevStatus) {
    if (patch.status === "resolved" && prevStatus !== "resolved") {
      const bonus = resolveBonusPoints(existing.ai);
      if (bonus > 0) {
        existing.pointsAwarded += bonus;
        await dbCreditCitizen(existing.citizenId, bonus, { resolvedDelta: 1 });
        pointsNote = ` · +${bonus} resolve bonus`;
      } else {
        await dbCreditCitizen(existing.citizenId, 0, { resolvedDelta: 1 });
      }
    }
    if (patch.status === "rejected" && prevStatus !== "rejected") {
      const claw = existing.pointsAwarded;
      if (claw > 0) {
        await dbCreditCitizen(existing.citizenId, -claw);
        existing.pointsAwarded = 0;
        pointsNote = ` · ${claw} points clawed back (rejected)`;
      }
      if (prevStatus === "resolved") {
        await dbCreditCitizen(existing.citizenId, 0, { resolvedDelta: -1 });
      }
    }
  }

  if (patch.status || patch.timelineNote) {
    existing.timeline = [
      ...existing.timeline,
      {
        id: `tl-${Date.now()}`,
        at: now,
        title: patch.timelineNote ?? `Status updated to ${patch.status}`,
        description:
          (patch.timelineNote ?? `Report moved to ${patch.status}.`) +
          pointsNote,
        actor: patch.actor ?? "AMC Ops",
        status: patch.status,
      },
    ];
  }

  const { error } = await db()
    .from("reports")
    .update(reportToRow(existing))
    .eq("id", id);
  if (error) throw error;

  const { error: nErr } = await db().from("notifications").insert({
    id: `n-${Date.now()}`,
    user_id: existing.citizenId,
    title: "Report update",
    body: `"${existing.title}" is now ${existing.status.replace("_", " ")}${pointsNote}.`,
    created_at: now,
    read: false,
    href: `/citizen/reports/${existing.id}`,
  } satisfies NotificationRow);
  if (nErr) throw nErr;

  return existing;
}

export async function dbGetDepartments() {
  const { data, error } = await db().from("departments").select("*");
  if (error) throw error;
  return (data ?? []).map(mapDepartment);
}

export async function dbGetWards() {
  const { data, error } = await db().from("wards").select("*");
  if (error) throw error;
  return (data ?? []).map(mapWard);
}

export async function dbGetBadges() {
  const { data, error } = await db().from("badges").select("*");
  if (error) throw error;
  return (data ?? []).map(mapBadge);
}

export async function dbGetRewards() {
  const { data, error } = await db().from("rewards").select("*");
  if (error) throw error;
  return (data ?? []).map(mapReward);
}

export async function dbGetLeaderboard() {
  // Prefer live citizen balances over stale seed rows
  try {
    const citizens = await dbGetCitizens();
    const live = buildLeaderboardFromUsers(citizens);
    if (live.length) return live;
  } catch {
    // fall through
  }
  const { data, error } = await db()
    .from("leaderboard_entries")
    .select("*")
    .order("rank", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapLeaderboard);
}

export async function dbGetNotifications(userId: string) {
  const { data, error } = await db()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function dbMarkNotificationRead(id: string, userId: string) {
  const { data, error } = await db()
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapNotification(data as NotificationRow) : null;
}

export async function dbGetDepartmentLeaderboard(): Promise<
  DepartmentRankingEntry[]
> {
  const depts = await dbGetDepartments();
  return [...depts]
    .map((dept) => {
      const score = Math.round(
        dept.efficiency * 0.55 +
          Math.min(
            100,
            (dept.resolvedIssues /
              Math.max(1, dept.resolvedIssues + dept.openIssues)) *
              100
          ) *
            0.35 +
          Math.max(0, 40 - dept.avgResolutionHours / 3)
      );
      return {
        departmentId: dept.id,
        name: dept.name,
        head: dept.head,
        score: Math.min(99, Math.max(40, score)),
        openIssues: dept.openIssues,
        resolvedIssues: dept.resolvedIssues,
        avgResolutionHours: dept.avgResolutionHours,
        efficiency: dept.efficiency,
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function dbGetWardLeaderboard(): Promise<WardRankingEntry[]> {
  const openStatuses = new Set([
    "submitted",
    "acknowledged",
    "assigned",
    "in_progress",
  ]);
  const [allReports, wardList, board] = await Promise.all([
    dbListReports(),
    dbGetWards(),
    dbGetLeaderboard(),
  ]);

  return [...wardList]
    .map((ward) => {
      const openIssues = allReports.filter(
        (r) => r.wardId === ward.id && openStatuses.has(r.status)
      ).length;
      const citizenPoints = board
        .filter((e) => e.ward === ward.name)
        .reduce((sum, e) => sum + e.points, 0);
      const score = Math.round(
        ward.healthScore * 0.6 +
          Math.max(0, 40 - openIssues * 2) +
          Math.min(20, citizenPoints / 100)
      );
      return {
        ward: ward.name,
        zone: ward.zone,
        score: Math.min(99, Math.max(35, score)),
        openIssues,
        healthScore: ward.healthScore,
        citizenPoints,
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function dbGetUrbanPulse(): Promise<UrbanPulseMetrics> {
  const [all, wardList] = await Promise.all([dbListReports(), dbGetWards()]);
  const openStatuses = new Set([
    "submitted",
    "acknowledged",
    "assigned",
    "in_progress",
  ]);
  const openIssues = all.filter((r) => openStatuses.has(r.status)).length;
  const closedIssues = all.filter((r) => r.status === "resolved").length;

  return {
    urbanPulseIndex: 78,
    infrastructureHealth: 76,
    openIssues,
    closedIssues,
    departmentEfficiency: 87,
    avgResolutionHours: 41,
    citizenParticipation: 72,
    monthlyTrends: [
      { month: "Feb", opened: 118, closed: 96 },
      { month: "Mar", opened: 132, closed: 121 },
      { month: "Apr", opened: 145, closed: 130 },
      { month: "May", opened: 168, closed: 149 },
      { month: "Jun", opened: 210, closed: 178 },
      { month: "Jul", opened: 186, closed: 154 },
    ],
    categoryBreakdown: [
      { category: "Roads", count: all.filter((r) => r.category === "roads").length },
      { category: "Water", count: all.filter((r) => r.category === "water").length },
      {
        category: "Drainage",
        count: all.filter((r) => r.category === "drainage").length,
      },
      {
        category: "Lighting",
        count: all.filter((r) => r.category === "lighting").length,
      },
      { category: "Waste", count: all.filter((r) => r.category === "waste").length },
      {
        category: "Footpath",
        count: all.filter((r) => r.category === "footpath").length,
      },
      { category: "Other", count: all.filter((r) => r.category === "other").length },
    ],
    wardComparison: wardList.map((w) => ({
      ward: w.name,
      score: w.healthScore,
      open: all.filter((r) => r.wardId === w.id && openStatuses.has(r.status))
        .length,
    })),
  };
}

export async function dbGetReportStats(filters?: {
  ward?: string;
  wards?: string[];
}) {
  return computeStats(
    await dbListReports({
      ward: filters?.ward,
      wards: filters?.wards,
    })
  );
}
