import { departments, wards } from "@/data/seed";
import { listReports } from "@/services/store";
import type {
  DepartmentId,
  InfrastructureReport,
  Priority,
  ReportCategory,
} from "@/types";

export type BacklogRisk = "low" | "medium" | "high";

export type OpsInsight = {
  predictedResolutionHours: number;
  predictedResolutionLabel: string;
  etaConfidence: number;
  safetyFlags: string[];
  similarOpenCount: number;
  similarTitles: string[];
  clusterNote: string;
  recommendedAction: string;
  department: {
    id: DepartmentId;
    name: string;
    openIssues: number;
    liveOpen: number;
    resolvedIssues: number;
    avgResolutionHours: number;
    efficiency: number;
    backlogRisk: BacklogRisk;
    performanceLabel: string;
  };
  ward: {
    name: string;
    openIssues: number;
    healthScore: number;
    pressureNote: string;
  };
};

const openStatuses = new Set([
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
]);

function categoryToDepartment(category: string): DepartmentId {
  if (category === "lighting") return "electrical";
  if (category === "waste") return "sanitation";
  if (category === "footpath") return "town-planning";
  if (category === "water") return "water";
  if (category === "drainage") return "drainage";
  return "roads";
}

function detectSafetyFlags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const flags: string[] = [];
  if (/skid|accident|injury|crash|fell|slip/.test(text)) {
    flags.push("Safety hazard language detected (skid / injury risk)");
  }
  if (/school|children|kids|hospital|elderly/.test(text)) {
    flags.push("Sensitive corridor near school / hospital / vulnerable users");
  }
  if (/knee-deep|flood|underpass|night|dark|outage/.test(text)) {
    flags.push("High-impact mobility or night-safety condition");
  }
  if (/cluster|multiple|three|several|stretch/.test(text)) {
    flags.push("Multi-point / corridor failure — may need crew bundle");
  }
  return flags;
}

function hoursLabel(hours: number): string {
  if (hours <= 12) return "Same day (≤12h)";
  if (hours <= 24) return "About 1 day";
  if (hours <= 48) return "1–2 days";
  if (hours <= 72) return "2–3 days";
  if (hours <= 120) return "3–5 days";
  return `${Math.ceil(hours / 24)}+ days`;
}

function backlogRisk(open: number, efficiency: number): BacklogRisk {
  if (open >= 18 || efficiency < 70) return "high";
  if (open >= 10 || efficiency < 82) return "medium";
  return "low";
}

function performanceLabel(efficiency: number, avgHours: number): string {
  if (efficiency >= 90 && avgHours <= 36) return "Running hot — strong clearance";
  if (efficiency >= 80) return "Stable clearance rate";
  if (efficiency >= 70) return "Under load — slower than target";
  return "Stretched — needs HQ support";
}

export async function buildOpsInsight(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
  departmentId?: DepartmentId;
  priority?: Priority;
}): Promise<OpsInsight> {
  const deptId =
    input.departmentId ?? categoryToDepartment(input.category);
  const dept =
    departments.find((d) => d.id === deptId) ?? departments[0];
  const wardName = input.ward ?? "Ahmedabad";
  const wardMeta = wards.find(
    (w) => w.name.toLowerCase() === wardName.toLowerCase()
  );

  const all = await listReports();
  const liveOpen = all.filter(
    (r) => r.departmentId === deptId && openStatuses.has(r.status)
  ).length;
  const wardOpen = all.filter(
    (r) =>
      r.ward.toLowerCase() === wardName.toLowerCase() &&
      openStatuses.has(r.status)
  ).length;

  const similar = all.filter(
    (r) =>
      openStatuses.has(r.status) &&
      r.ward.toLowerCase() === wardName.toLowerCase() &&
      (r.category === input.category || r.departmentId === deptId)
  );
  const similarTitles = similar.slice(0, 3).map((r) => r.title);

  const priority = input.priority ?? "medium";
  const priorityFactor =
    priority === "critical" ? 0.55 : priority === "high" ? 0.75 : priority === "low" ? 1.25 : 1;
  const backlogFactor = 1 + Math.min(0.45, liveOpen / 40);
  const clusterFactor = similar.length >= 3 ? 0.85 : similar.length >= 1 ? 0.95 : 1;
  const safetyFlags = detectSafetyFlags(input.title, input.description);
  const safetyFactor = safetyFlags.length ? 0.8 : 1;

  const predicted = Math.max(
    8,
    Math.round(
      dept.avgResolutionHours *
        priorityFactor *
        backlogFactor *
        clusterFactor *
        safetyFactor
    )
  );

  const risk = backlogRisk(liveOpen, dept.efficiency);
  const clusterNote =
    similar.length === 0
      ? `No other open ${input.category} tickets in ${wardName} — likely an isolated intake.`
      : similar.length === 1
        ? `1 similar open ticket already in ${wardName} for this desk.`
        : `${similar.length} similar open tickets in ${wardName} — possible corridor cluster.`;

  const pressureNote =
    wardOpen >= 8
      ? `${wardName} is under elevated open-ticket pressure (${wardOpen} open).`
      : wardOpen >= 4
        ? `${wardName} has a moderate open load (${wardOpen}).`
        : `${wardName} currently has a manageable open load (${wardOpen}).`;

  let recommendedAction =
    "Route to ward desk, acknowledge within SLA, and schedule field inspection.";
  if (safetyFlags.length && priority !== "low") {
    recommendedAction =
      "Prioritize same-day site check — safety language + predicted urgency warrant expedited dispatch.";
  } else if (similar.length >= 3) {
    recommendedAction =
      "Bundle with nearby open tickets for one crew sweep to cut repeat mobilizations.";
  } else if (risk === "high") {
    recommendedAction =
      "Department backlog is high — escalate to HQ for surge crew or temporary reassignment.";
  }

  return {
    predictedResolutionHours: predicted,
    predictedResolutionLabel: hoursLabel(predicted),
    etaConfidence: Number(
      Math.max(
        0.55,
        Math.min(
          0.92,
          0.78 - liveOpen * 0.008 + dept.efficiency / 500 + (similar.length ? 0.04 : 0)
        )
      ).toFixed(2)
    ),
    safetyFlags,
    similarOpenCount: similar.length,
    similarTitles,
    clusterNote,
    recommendedAction,
    department: {
      id: dept.id,
      name: dept.name,
      openIssues: dept.openIssues,
      liveOpen,
      resolvedIssues: dept.resolvedIssues,
      avgResolutionHours: dept.avgResolutionHours,
      efficiency: dept.efficiency,
      backlogRisk: risk,
      performanceLabel: performanceLabel(dept.efficiency, dept.avgResolutionHours),
    },
    ward: {
      name: wardName,
      openIssues: wardOpen,
      healthScore: wardMeta?.healthScore ?? 75,
      pressureNote,
    },
  };
}

export async function buildDepartmentPulse() {
  const all = await listReports();
  return departments.map((dept) => {
    const liveOpen = all.filter(
      (r) => r.departmentId === dept.id && openStatuses.has(r.status)
    ).length;
    const liveCritical = all.filter(
      (r) =>
        r.departmentId === dept.id &&
        openStatuses.has(r.status) &&
        r.priority === "critical"
    ).length;
    const resolved = all.filter(
      (r) => r.departmentId === dept.id && r.status === "resolved"
    ).length;
    const risk = backlogRisk(liveOpen, dept.efficiency);
    return {
      id: dept.id,
      name: dept.name,
      head: dept.head,
      liveOpen,
      liveCritical,
      resolvedSample: resolved,
      avgResolutionHours: dept.avgResolutionHours,
      efficiency: dept.efficiency,
      backlogRisk: risk,
      performanceLabel: performanceLabel(dept.efficiency, dept.avgResolutionHours),
      predictedClearanceDays: Math.max(
        1,
        Math.round((liveOpen * dept.avgResolutionHours) / 24 / Math.max(1, dept.efficiency / 40))
      ),
    };
  });
}

export async function findIssuePatterns(limit = 5): Promise<
  Array<{
    key: string;
    ward: string;
    category: ReportCategory;
    count: number;
    sampleTitle: string;
  }>
> {
  const all = (await listReports()).filter((r) => openStatuses.has(r.status));
  const map = new Map<string, InfrastructureReport[]>();
  for (const r of all) {
    const key = `${r.ward}::${r.category}`;
    const bucket = map.get(key) ?? [];
    bucket.push(r);
    map.set(key, bucket);
  }
  return Array.from(map.entries())
    .map(([key, items]) => {
      const [ward, category] = key.split("::");
      return {
        key,
        ward,
        category: category as ReportCategory,
        count: items.length,
        sampleTitle: items[0]?.title ?? "Issue cluster",
      };
    })
    .filter((p) => p.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
