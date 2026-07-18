import {
  badges,
  departments,
  leaderboard,
  notifications as seedNotifications,
  rewards,
  seedReports,
  users,
  wards,
} from "@/data/seed";
import type {
  DepartmentRankingEntry,
  InfrastructureReport,
  ModerationAction,
  NotificationItem,
  ReportStatus,
  UrbanPulseMetrics,
  UserModerationEvent,
  UserProfile,
  WardRankingEntry,
} from "@/types";
import { getDashboardStats as computeStats } from "@/services/analytics";

type UrbanexusStore = {
  reports: InfrastructureReport[];
  notifications: NotificationItem[];
  users: UserProfile[];
  moderationEvents: UserModerationEvent[];
};

declare global {
  // eslint-disable-next-line no-var
  var __urbanexusStore: UrbanexusStore | undefined;
}

function getStore(): UrbanexusStore {
  if (!globalThis.__urbanexusStore) {
    globalThis.__urbanexusStore = {
      reports: structuredClone(seedReports),
      notifications: structuredClone(seedNotifications),
      users: structuredClone(users).map((u) => ({
        ...u,
        accountStatus: u.accountStatus ?? "active",
        flagCount: u.flagCount ?? 0,
      })),
      moderationEvents: [],
    };
  } else if (!globalThis.__urbanexusStore.users) {
    // Hot-reload older store shapes
    globalThis.__urbanexusStore.users = structuredClone(users).map((u) => ({
      ...u,
      accountStatus: u.accountStatus ?? "active",
      flagCount: u.flagCount ?? 0,
    }));
    globalThis.__urbanexusStore.moderationEvents =
      globalThis.__urbanexusStore.moderationEvents ?? [];
  }
  return globalThis.__urbanexusStore;
}

export function memoryGetUsers() {
  return [...getStore().users];
}

export function memoryGetUserById(id: string): UserProfile | undefined {
  return getStore().users.find((u) => u.id === id);
}

export function memoryGetUserByEmail(email: string): UserProfile | undefined {
  return getStore().users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function memoryGetCitizens() {
  return getStore().users.filter((u) => u.role === "citizen");
}

export function memoryModerateUser(input: {
  userId: string;
  action: ModerationAction;
  reason: string;
  reportId?: string;
  actorId: string;
  actorName: string;
}): UserProfile | null {
  const store = getStore();
  const user = store.users.find((u) => u.id === input.userId);
  if (!user || user.role !== "citizen") return null;

  const now = new Date().toISOString();
  const reason = input.reason.trim();
  if (reason.length < 4) return null;

  if (input.action === "flag") {
    user.accountStatus = "flagged";
    user.flagCount = (user.flagCount ?? 0) + 1;
  } else if (input.action === "suspend") {
    user.accountStatus = "suspended";
  } else if (input.action === "remove") {
    user.accountStatus = "removed";
  } else if (input.action === "reinstate") {
    user.accountStatus = "active";
    user.flagCount = 0;
  }

  user.moderationNote = reason;
  user.moderatedAt = now;
  user.moderatedBy = input.actorName;

  store.moderationEvents.unshift({
    id: `mod-${Date.now()}`,
    userId: user.id,
    action: input.action,
    reason,
    reportId: input.reportId,
    actorId: input.actorId,
    actorName: input.actorName,
    createdAt: now,
  });

  store.notifications.unshift({
    id: `n-mod-${Date.now()}`,
    userId: user.id,
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
    createdAt: now,
    read: false,
    href: "/citizen/profile",
  });

  return { ...user };
}

export function memoryGetModerationEvents(userId?: string) {
  const events = getStore().moderationEvents;
  if (!userId) return [...events];
  return events.filter((e) => e.userId === userId);
}

export function memoryListReports(filters?: {
  citizenId?: string;
  status?: ReportStatus;
  ward?: string;
  wards?: string[];
  priority?: string;
  departmentId?: string;
  q?: string;
}) {
  let result = [...getStore().reports];

  if (filters?.citizenId) {
    result = result.filter((r) => r.citizenId === filters.citizenId);
  }
  if (filters?.status) {
    result = result.filter((r) => r.status === filters.status);
  }
  if (filters?.wards?.length) {
    const set = new Set(filters.wards.map((w) => w.toLowerCase()));
    result = result.filter((r) => set.has(r.ward.toLowerCase()));
  } else if (filters?.ward) {
    result = result.filter(
      (r) => r.ward.toLowerCase() === filters.ward!.toLowerCase()
    );
  }
  if (filters?.priority) {
    result = result.filter((r) => r.priority === filters.priority);
  }
  if (filters?.departmentId) {
    result = result.filter((r) => r.departmentId === filters.departmentId);
  }
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

  return result.sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function memoryGetReportById(id: string) {
  return getStore().reports.find((r) => r.id === id);
}

export function memoryCreateReport(
  input: Omit<
    InfrastructureReport,
    "id" | "createdAt" | "updatedAt" | "timeline" | "pointsAwarded" | "status"
  > & { status?: ReportStatus }
): InfrastructureReport {
  const now = new Date().toISOString();
  const report: InfrastructureReport = {
    ...input,
    id: `rpt-${Date.now()}`,
    status: input.status ?? "submitted",
    createdAt: now,
    updatedAt: now,
    pointsAwarded:
      input.priority === "critical"
        ? 120
        : input.priority === "high"
          ? 80
          : 50,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        at: now,
        title: "Report submitted",
        description: "Citizen report received via Urbanexus.",
        actor: input.citizenName,
        status: "submitted",
      },
    ],
  };
  const store = getStore();
  store.reports.unshift(report);

  store.notifications.unshift({
    id: `n-${Date.now()}`,
    userId: input.citizenId,
    title: "Report submitted",
    body: `Your report "${report.title}" is now in the AMC queue.`,
    createdAt: now,
    read: false,
    href: `/citizen/reports/${report.id}`,
  });

  return report;
}

export function memoryUpdateReport(
  id: string,
  patch: Partial<
    Pick<
      InfrastructureReport,
      "status" | "priority" | "assignedTo" | "departmentId" | "ai"
    >
  > & { timelineNote?: string; actor?: string }
) {
  const report = getStore().reports.find((r) => r.id === id);
  if (!report) return null;

  const now = new Date().toISOString();
  if (patch.status) report.status = patch.status;
  if (patch.priority) report.priority = patch.priority;
  if (patch.assignedTo !== undefined) report.assignedTo = patch.assignedTo;
  if (patch.departmentId) report.departmentId = patch.departmentId;
  if (patch.ai) report.ai = patch.ai;
  report.updatedAt = now;

  if (patch.status || patch.timelineNote) {
    report.timeline.push({
      id: `tl-${Date.now()}`,
      at: now,
      title: patch.timelineNote ?? `Status updated to ${patch.status}`,
      description: patch.timelineNote ?? `Report moved to ${patch.status}.`,
      actor: patch.actor ?? "AMC Ops",
      status: patch.status,
    });
  }

  getStore().notifications.unshift({
    id: `n-${Date.now()}`,
    userId: report.citizenId,
    title: "Report update",
    body: `"${report.title}" is now ${report.status.replace("_", " ")}.`,
    createdAt: now,
    read: false,
    href: `/citizen/reports/${report.id}`,
  });

  return report;
}

export function memoryGetDepartments() {
  return departments;
}

export function memoryGetWards() {
  return wards;
}

export function memoryGetBadges() {
  return badges;
}

export function memoryGetRewards() {
  return rewards;
}

export function memoryGetLeaderboard() {
  return leaderboard;
}

export function memoryGetNotifications(userId: string) {
  return getStore()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function memoryMarkNotificationRead(id: string, userId: string) {
  const item = getStore().notifications.find(
    (n) => n.id === id && n.userId === userId
  );
  if (item) item.read = true;
  return item;
}

export function memoryGetDepartmentLeaderboard(): DepartmentRankingEntry[] {
  return [...departments]
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

export function memoryGetWardLeaderboard(): WardRankingEntry[] {
  const openStatuses = new Set([
    "submitted",
    "acknowledged",
    "assigned",
    "in_progress",
  ]);
  const allReports = memoryListReports();

  return [...wards]
    .map((ward) => {
      const openIssues = allReports.filter(
        (r) => r.wardId === ward.id && openStatuses.has(r.status)
      ).length;
      const citizenPoints = leaderboard
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

export function memoryGetUrbanPulse(): UrbanPulseMetrics {
  const all = memoryListReports();
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
    wardComparison: wards.map((w) => ({
      ward: w.name,
      score: w.healthScore,
      open: all.filter((r) => r.wardId === w.id && openStatuses.has(r.status))
        .length,
    })),
  };
}

export function memoryGetReportStats(filters?: {
  ward?: string;
  wards?: string[];
}) {
  return computeStats(
    memoryListReports({
      ward: filters?.ward,
      wards: filters?.wards,
    })
  );
}
