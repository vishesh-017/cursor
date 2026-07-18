export type ReportCategory =
  | "roads"
  | "water"
  | "drainage"
  | "lighting"
  | "waste"
  | "other";

export type ReportStatus = "open" | "in_progress" | "resolved";

export type Priority = "low" | "medium" | "high" | "critical";

export interface InfrastructureReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: Priority;
  ward: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  imageUrl?: string;
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
