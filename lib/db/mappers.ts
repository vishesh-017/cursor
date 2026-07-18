import type {
  AiAnalysis,
  Badge,
  Department,
  DepartmentId,
  InfrastructureReport,
  LeaderboardEntry,
  NotificationItem,
  Priority,
  ReportCategory,
  ReportStatus,
  Reward,
  TimelineEvent,
  UserProfile,
  UserRole,
  Ward,
  AdminScope,
} from "@/types";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  ward: string;
  admin_scope: string | null;
  managed_wards: string[] | null;
  avatar_url: string;
  points: number;
  badges: string[] | null;
  joined_at: string;
  reports_count: number;
  resolved_count: number;
  account_status?: string | null;
  flag_count?: number | null;
  moderation_note?: string | null;
  moderated_at?: string | null;
  moderated_by?: string | null;
};

export type ReportRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  ward: string;
  ward_id: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  citizen_id: string;
  citizen_name: string;
  assigned_to: string | null;
  department_id: string;
  image_url: string | null;
  image_urls: string[] | null;
  ai: AiAnalysis | null;
  timeline: TimelineEvent[] | null;
  points_awarded: number;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  href: string;
};

export function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role as UserRole,
    ward: row.ward,
    adminScope: (row.admin_scope as AdminScope | null) ?? undefined,
    managedWards: row.managed_wards?.length ? row.managed_wards : undefined,
    avatarUrl: row.avatar_url,
    points: row.points,
    badges: row.badges ?? [],
    joinedAt: row.joined_at,
    reportsCount: row.reports_count,
    resolvedCount: row.resolved_count,
    accountStatus:
      (row.account_status as UserProfile["accountStatus"]) ?? "active",
    flagCount: row.flag_count ?? 0,
    moderationNote: row.moderation_note ?? undefined,
    moderatedAt: row.moderated_at ?? undefined,
    moderatedBy: row.moderated_by ?? undefined,
  };
}

export function userToRow(user: UserProfile): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ward: user.ward,
    admin_scope: user.adminScope ?? null,
    managed_wards: user.managedWards ?? [],
    avatar_url: user.avatarUrl,
    points: user.points,
    badges: user.badges,
    joined_at: user.joinedAt,
    reports_count: user.reportsCount,
    resolved_count: user.resolvedCount,
    account_status: user.accountStatus ?? "active",
    flag_count: user.flagCount ?? 0,
    moderation_note: user.moderationNote ?? null,
    moderated_at: user.moderatedAt ?? null,
    moderated_by: user.moderatedBy ?? null,
  };
}

export function mapReport(row: ReportRow): InfrastructureReport {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as ReportCategory,
    status: row.status as ReportStatus,
    priority: row.priority as Priority,
    ward: row.ward,
    wardId: row.ward_id,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    citizenId: row.citizen_id,
    citizenName: row.citizen_name,
    assignedTo: row.assigned_to ?? undefined,
    departmentId: row.department_id as DepartmentId,
    imageUrl: row.image_url ?? undefined,
    imageUrls: row.image_urls?.length ? row.image_urls : undefined,
    ai: row.ai ?? undefined,
    timeline: row.timeline ?? [],
    pointsAwarded: row.points_awarded,
  };
}

export function reportToRow(report: InfrastructureReport): ReportRow {
  return {
    id: report.id,
    title: report.title,
    description: report.description,
    category: report.category,
    status: report.status,
    priority: report.priority,
    ward: report.ward,
    ward_id: report.wardId,
    address: report.address,
    latitude: report.latitude,
    longitude: report.longitude,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
    citizen_id: report.citizenId,
    citizen_name: report.citizenName,
    assigned_to: report.assignedTo ?? null,
    department_id: report.departmentId,
    image_url: report.imageUrl ?? null,
    image_urls: report.imageUrls ?? [],
    ai: report.ai ?? null,
    timeline: report.timeline,
    points_awarded: report.pointsAwarded,
  };
}

export function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    href: row.href,
  };
}

export function mapWard(row: {
  id: string;
  name: string;
  zone: string;
  population: number;
  center: { lat: number; lng: number };
  boundary: Array<[number, number]>;
  health_score: number;
  open_issues: number;
}): Ward {
  return {
    id: row.id,
    name: row.name,
    zone: row.zone,
    population: row.population,
    center: row.center,
    boundary: row.boundary,
    healthScore: row.health_score,
    openIssues: row.open_issues,
  };
}

export function mapDepartment(row: {
  id: string;
  name: string;
  head: string;
  open_issues: number;
  resolved_issues: number;
  avg_resolution_hours: number;
  efficiency: number;
}): Department {
  return {
    id: row.id as DepartmentId,
    name: row.name,
    head: row.head,
    openIssues: row.open_issues,
    resolvedIssues: row.resolved_issues,
    avgResolutionHours: row.avg_resolution_hours,
    efficiency: row.efficiency,
  };
}

export function mapBadge(row: {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
}): Badge {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    pointsRequired: row.points_required,
  };
}

export function mapReward(row: {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  available: boolean;
}): Reward {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pointsCost: row.points_cost,
    available: row.available,
  };
}

export function mapLeaderboard(row: {
  user_id: string;
  rank: number;
  name: string;
  ward: string;
  points: number;
  reports: number;
  badges: number;
}): LeaderboardEntry {
  return {
    userId: row.user_id,
    rank: row.rank,
    name: row.name,
    ward: row.ward,
    points: row.points,
    reports: row.reports,
    badges: row.badges,
  };
}
