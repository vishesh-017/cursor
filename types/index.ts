export type UserRole = "citizen" | "admin" | "officer";

/** City HQ sees all wards; ward desks only receive their ward inbox. */
export type AdminScope = "city" | "ward";

/** Citizen account lifecycle for fake-report enforcement. */
export type AccountStatus = "active" | "flagged" | "suspended" | "removed";

export type ModerationAction = "flag" | "suspend" | "remove" | "reinstate";

export interface UserModerationEvent {
  id: string;
  userId: string;
  action: ModerationAction;
  reason: string;
  reportId?: string;
  actorId: string;
  actorName: string;
  createdAt: string;
}

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
  /** Home ward for citizens; primary desk ward for officers/admins. */
  ward: string;
  /** City-wide HQ vs single-ward operations desk. */
  adminScope?: AdminScope;
  /** Wards this admin/officer may open. Defaults to [ward] when adminScope is ward. */
  managedWards?: string[];
  avatarUrl: string;
  points: number;
  badges: string[];
  joinedAt: string;
  reportsCount: number;
  resolvedCount: number;
  /** Defaults to active when omitted (seed users). */
  accountStatus?: AccountStatus;
  /** Times officers flagged this account for fake / spam reports. */
  flagCount?: number;
  /** Latest moderation note from AMC desk. */
  moderationNote?: string;
  moderatedAt?: string;
  moderatedBy?: string;
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

export type AuthenticityVerdict = "likely_true" | "possibly_fake" | "uncertain";

export type ImageRelevance = "relevant" | "not_relevant" | "uncertain";

/** Whether the evidence photo looks like a real camera shot vs AI/synthetic. */
export type ImageOriginVerdict =
  | "likely_photo"
  | "possibly_ai_generated"
  | "uncertain";

export interface AiAnalysis {
  detection: string;
  damageClass: string;
  severity: Priority;
  summary: string;
  suggestedDepartment: DepartmentId;
  suggestedPriority: Priority;
  /** Model confidence in the triage overall (0–1). */
  confidence: number;
  /** Whether the report appears genuine vs fabricated/spam. */
  authenticity: AuthenticityVerdict;
  /** Confidence that authenticity verdict is correct (0–1). */
  authenticityScore: number;
  /** Numeric priority score for AMC queue sorting (0–100). */
  priorityScore: number;
  /** Short plain-language issue detected. */
  issueDetected: string;
  standardsNote?: string;
  /** Whether uploaded photo looks like civic infrastructure evidence. */
  imageRelevant?: ImageRelevance;
  /** Confidence that image relevance verdict is correct (0–1). */
  imageRelevanceScore?: number;
  /** Real phone photo vs possible AI / synthetic image. */
  imageOrigin?: ImageOriginVerdict;
  /** Confidence in the image-origin verdict (0–1). */
  imageOriginScore?: number;
  /** Short scene label from image scan. */
  imageScene?: string;
  /** Department inferred from image scan. */
  imageDepartmentHint?: DepartmentId;
  /** Issue visible in the photo. */
  imageIssueHint?: string;
  /** Officer-facing notes from image scan. */
  imageNotes?: string;
  /** Citizen/officer warnings (unrelated, AI-gen, mismatch). */
  imageWarnings?: string[];
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
  imageUrls?: string[];
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

export interface DepartmentRankingEntry {
  rank: number;
  departmentId: DepartmentId;
  name: string;
  head: string;
  score: number;
  openIssues: number;
  resolvedIssues: number;
  avgResolutionHours: number;
  efficiency: number;
}

export interface WardRankingEntry {
  rank: number;
  ward: string;
  zone: string;
  score: number;
  openIssues: number;
  healthScore: number;
  citizenPoints: number;
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
  adminScope?: AdminScope;
  managedWards?: string[];
}
