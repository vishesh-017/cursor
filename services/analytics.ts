import type { DashboardStats, InfrastructureReport, ReportCategory } from "@/types";

export function getDashboardStats(
  reports: InfrastructureReport[]
): DashboardStats {
  const categories: ReportCategory[] = [
    "roads",
    "water",
    "drainage",
    "lighting",
    "waste",
    "footpath",
    "other",
  ];

  const byCategory = categories.map((category) => ({
    category,
    count: reports.filter((r) => r.category === category).length,
  }));

  const wardMap = new Map<string, number>();
  for (const report of reports) {
    wardMap.set(report.ward, (wardMap.get(report.ward) ?? 0) + 1);
  }

  const openStatuses = new Set([
    "submitted",
    "acknowledged",
    "assigned",
    "in_progress",
  ]);

  return {
    totalReports: reports.length,
    openReports: reports.filter((r) => openStatuses.has(r.status)).length,
    resolvedReports: reports.filter((r) => r.status === "resolved").length,
    criticalReports: reports.filter((r) => r.priority === "critical").length,
    byCategory,
    byWard: Array.from(wardMap.entries()).map(([ward, count]) => ({
      ward,
      count,
    })),
    weeklyTrend: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day, index) => ({
        day,
        reports: Math.max(2, reports.length - index + (index % 3)),
      })
    ),
  };
}
