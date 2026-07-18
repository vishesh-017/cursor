export type UserRole = "citizen" | "admin" | "officer";

export type ReportCategory =
  | "roads"
  | "water"
  | "drainage"
  | "lighting"
  | "waste"
  | "footpath"
  | "other";

export type ReportStatus =
  | "submitted"
  | "acknowledged"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected";

export type Priority = "low" | "medium" | "high" | "critical";

export type DepartmentId =
  | "roads"
  | "water"
  | "drainage"
  | "electrical"
  | "sanitation"
  | "town-planning";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  ward: string;
  avatarUrl: string;
  points: number;
  badges: string[];
  joinedAt: string;
  reportsCount: number;
  resolvedCount: number;
}

export interface Department {
  id: DepartmentId;
  name: string;
  head: string;
  openIssues: number;
  resolvedIssues: number;
  avgResolutionHours: number;
  efficiency: number;
}

export interface Ward {
  id: string;
  name: string;
  zone: string;
  population: number;
  center: { lat: number; lng: number };
  boundary: Array<[number, number]>;
  healthScore: number;
  openIssues: number;
}

export interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  description: string;
  actor: string;
  status?: ReportStatus;
}

export interface AiAnalysis {
  detection: string;
  damageClass: string;
  severity: Priority;
  summary: string;
  suggestedDepartment: DepartmentId;
  suggestedPriority: Priority;
  confidence: number;
  standardsNote?: string;
}

export interface InfrastructureReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: Priority;
  ward: string;
  wardId: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  citizenId: string;
  citizenName: string;
  assignedTo?: string;
  departmentId: DepartmentId;
  imageUrl?: string;
  ai?: AiAnalysis;
  timeline: TimelineEvent[];
  pointsAwarded: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsRequired: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  available: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  ward: string;
  points: number;
  reports: number;
  badges: number;
}

export interface DashboardStats {
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  criticalReports: number;
  byCategory: Array<{ category: ReportCategory; count: number }>;
  byWard: Array<{ ward: string; count: number }>;
  weeklyTrend: Array<{ day: string; reports: number }>;
}

export interface UrbanPulseMetrics {
  urbanPulseIndex: number;
  infrastructureHealth: number;
  openIssues: number;
  closedIssues: number;
  departmentEfficiency: number;
  avgResolutionHours: number;
  citizenParticipation: number;
  monthlyTrends: Array<{ month: string; opened: number; closed: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  wardComparison: Array<{ ward: string; score: number; open: number }>;
}

export interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string | null;
  author?: string | null;
  score?: number | null;
  text?: string | null;
}

export interface ExaAnswerResult {
  answer: string;
  citations: ExaSearchResult[];
}

export interface ResearchResult {
  query: string;
  answer: string;
  sources: ExaSearchResult[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ward: string;
}
