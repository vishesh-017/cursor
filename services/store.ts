import { isDatabaseConfigured } from "@/lib/db/config";
import type {
  InfrastructureReport,
  ModerationAction,
  ReportStatus,
} from "@/types";
import {
  memoryCreateReport,
  memoryGetBadges,
  memoryGetCitizens,
  memoryGetDepartmentLeaderboard,
  memoryGetDepartments,
  memoryGetLeaderboard,
  memoryGetModerationEvents,
  memoryGetNotifications,
  memoryGetReportById,
  memoryGetReportStats,
  memoryGetRewards,
  memoryGetUrbanPulse,
  memoryGetUserByEmail,
  memoryGetUserById,
  memoryGetUsers,
  memoryGetWardLeaderboard,
  memoryGetWards,
  memoryListReports,
  memoryMarkNotificationRead,
  memoryModerateUser,
  memoryUpdateReport,
} from "@/services/memory-store";
import {
  dbCreateReport,
  dbGetBadges,
  dbGetCitizens,
  dbGetDepartmentLeaderboard,
  dbGetDepartments,
  dbGetLeaderboard,
  dbGetNotifications,
  dbGetReportById,
  dbGetReportStats,
  dbGetRewards,
  dbGetUrbanPulse,
  dbGetUserByEmail,
  dbGetUserById,
  dbGetUsers,
  dbGetWardLeaderboard,
  dbGetWards,
  dbListReports,
  dbMarkNotificationRead,
  dbModerateUser,
  dbUpdateReport,
} from "@/services/supabase-store";
import { getDashboardStats as computeStats } from "@/services/analytics";

function useDb() {
  return isDatabaseConfigured();
}

export async function getUsers() {
  return useDb() ? dbGetUsers() : memoryGetUsers();
}

export async function getUserById(id: string) {
  return useDb() ? dbGetUserById(id) : memoryGetUserById(id);
}

export async function getUserByEmail(email: string) {
  return useDb() ? dbGetUserByEmail(email) : memoryGetUserByEmail(email);
}

export async function getCitizens() {
  return useDb() ? dbGetCitizens() : memoryGetCitizens();
}

export async function moderateUser(input: {
  userId: string;
  action: ModerationAction;
  reason: string;
  reportId?: string;
  actorId: string;
  actorName: string;
}) {
  return useDb() ? dbModerateUser(input) : memoryModerateUser(input);
}

export async function getModerationEvents(userId?: string) {
  if (useDb()) {
    // Events live in moderation_events; optional fetch for detail views later.
    return [];
  }
  return memoryGetModerationEvents(userId);
}

export async function listReports(filters?: {
  citizenId?: string;
  status?: ReportStatus;
  ward?: string;
  wards?: string[];
  priority?: string;
  departmentId?: string;
  q?: string;
}) {
  return useDb() ? dbListReports(filters) : memoryListReports(filters);
}

export async function getReportById(id: string) {
  return useDb() ? dbGetReportById(id) : memoryGetReportById(id);
}

export async function createReport(
  input: Omit<
    InfrastructureReport,
    "id" | "createdAt" | "updatedAt" | "timeline" | "pointsAwarded" | "status"
  > & { status?: ReportStatus }
) {
  return useDb() ? dbCreateReport(input) : memoryCreateReport(input);
}

export async function updateReport(
  id: string,
  patch: Partial<
    Pick<
      InfrastructureReport,
      "status" | "priority" | "assignedTo" | "departmentId" | "ai"
    >
  > & { timelineNote?: string; actor?: string }
) {
  return useDb() ? dbUpdateReport(id, patch) : memoryUpdateReport(id, patch);
}

export async function getDepartments() {
  return useDb() ? dbGetDepartments() : memoryGetDepartments();
}

export async function getWards() {
  return useDb() ? dbGetWards() : memoryGetWards();
}

export async function getBadges() {
  return useDb() ? dbGetBadges() : memoryGetBadges();
}

export async function getRewards() {
  return useDb() ? dbGetRewards() : memoryGetRewards();
}

export async function getLeaderboard() {
  return useDb() ? dbGetLeaderboard() : memoryGetLeaderboard();
}

export async function getDepartmentLeaderboard() {
  return useDb()
    ? dbGetDepartmentLeaderboard()
    : memoryGetDepartmentLeaderboard();
}

export async function getWardLeaderboard() {
  return useDb() ? dbGetWardLeaderboard() : memoryGetWardLeaderboard();
}

export async function getNotifications(userId: string) {
  return useDb()
    ? dbGetNotifications(userId)
    : memoryGetNotifications(userId);
}

export async function markNotificationRead(id: string, userId: string) {
  return useDb()
    ? dbMarkNotificationRead(id, userId)
    : memoryMarkNotificationRead(id, userId);
}

export async function getUrbanPulse() {
  return useDb() ? dbGetUrbanPulse() : memoryGetUrbanPulse();
}

export async function getReportStats(filters?: {
  ward?: string;
  wards?: string[];
}) {
  return useDb() ? dbGetReportStats(filters) : memoryGetReportStats(filters);
}

export { computeStats as getDashboardStats, isDatabaseConfigured };
