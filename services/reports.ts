import type {
  DashboardStats,
  InfrastructureReport,
  ReportCategory,
} from "@/types";

const seedReports: InfrastructureReport[] = [
  {
    id: "rpt-1001",
    title: "Pothole cluster on SG Highway",
    description:
      "Multiple deep potholes near ISKCON crossroads causing traffic slowdowns and two-wheeler risk.",
    category: "roads",
    status: "open",
    priority: "high",
    ward: "Thaltej",
    latitude: 23.0495,
    longitude: 72.5078,
    createdAt: "2026-07-16T08:20:00.000Z",
  },
  {
    id: "rpt-1002",
    title: "Water logging at Maninagar underpass",
    description:
      "Standing water after monsoon showers; drainage outlet appears clogged.",
    category: "drainage",
    status: "in_progress",
    priority: "critical",
    ward: "Maninagar",
    latitude: 22.9972,
    longitude: 72.6025,
    createdAt: "2026-07-15T14:05:00.000Z",
  },
  {
    id: "rpt-1003",
    title: "Streetlight outage — CG Road stretch",
    description: "Dark stretch between Law Garden and Panchvati for three nights.",
    category: "lighting",
    status: "open",
    priority: "medium",
    ward: "Ellisbridge",
    latitude: 23.0228,
    longitude: 72.5711,
    createdAt: "2026-07-17T19:40:00.000Z",
  },
  {
    id: "rpt-1004",
    title: "Overflowing waste bins near AMTS depot",
    description: "Bins not cleared; odour complaints from residents and shopkeepers.",
    category: "waste",
    status: "resolved",
    priority: "medium",
    ward: "Geeta Mandir",
    latitude: 23.0136,
    longitude: 72.5894,
    createdAt: "2026-07-12T10:15:00.000Z",
  },
  {
    id: "rpt-1005",
    title: "Low water pressure in Vastrapur sector",
    description: "Morning supply drops below usable pressure for multi-storey blocks.",
    category: "water",
    status: "in_progress",
    priority: "high",
    ward: "Vastrapur",
    latitude: 23.0387,
    longitude: 72.5289,
    createdAt: "2026-07-14T06:50:00.000Z",
  },
  {
    id: "rpt-1006",
    title: "Broken footpath near BRTS corridor",
    description: "Uneven slabs creating accessibility barrier for pedestrians.",
    category: "roads",
    status: "open",
    priority: "low",
    ward: "Bopal",
    latitude: 23.0301,
    longitude: 72.4682,
    createdAt: "2026-07-18T05:10:00.000Z",
  },
];

const memoryReports: InfrastructureReport[] = [...seedReports];

export function listReports(): InfrastructureReport[] {
  return [...memoryReports].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export function createReport(
  input: Omit<InfrastructureReport, "id" | "createdAt" | "status"> & {
    status?: InfrastructureReport["status"];
  }
): InfrastructureReport {
  const report: InfrastructureReport = {
    ...input,
    id: `rpt-${Date.now()}`,
    status: input.status ?? "open",
    createdAt: new Date().toISOString(),
  };
  memoryReports.unshift(report);
  return report;
}

export function getDashboardStats(
  reports: InfrastructureReport[] = listReports()
): DashboardStats {
  const categories: ReportCategory[] = [
    "roads",
    "water",
    "drainage",
    "lighting",
    "waste",
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

  const weeklyTrend = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day, index) => ({
      day,
      reports: Math.max(1, reports.length - index + (index % 3)),
    })
  );

  return {
    totalReports: reports.length,
    openReports: reports.filter((r) => r.status === "open").length,
    resolvedReports: reports.filter((r) => r.status === "resolved").length,
    criticalReports: reports.filter((r) => r.priority === "critical").length,
    byCategory,
    byWard: Array.from(wardMap.entries()).map(([ward, count]) => ({
      ward,
      count,
    })),
    weeklyTrend,
  };
}
