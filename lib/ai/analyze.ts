import { answer, research } from "@/lib/ai/exa";
import type { AiAnalysis, DepartmentId, Priority } from "@/types";

const departments: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

const priorities: Priority[] = ["low", "medium", "high", "critical"];

function inferFromText(input: {
  title: string;
  description: string;
  category: string;
}): Omit<AiAnalysis, "summary" | "standardsNote" | "confidence"> {
  const text = `${input.title} ${input.description} ${input.category}`.toLowerCase();
  let suggestedDepartment: DepartmentId = "roads";
  let severity: Priority = "medium";
  let detection = "General urban infrastructure issue";
  let damageClass = "Unclassified surface defect";

  if (text.includes("water") || text.includes("leak") || text.includes("pressure")) {
    suggestedDepartment = "water";
    detection = "Water supply anomaly";
    damageClass = "Utility leakage / pressure failure";
    severity = "high";
  } else if (
    text.includes("drain") ||
    text.includes("flood") ||
    text.includes("sewage") ||
    text.includes("waterlog")
  ) {
    suggestedDepartment = "drainage";
    detection = "Drainage obstruction or sewer surcharge";
    damageClass = "Storm-water / sewer failure";
    severity =
      text.includes("flood") || text.includes("underpass") ? "critical" : "high";
  } else if (text.includes("light") || text.includes("lamp")) {
    suggestedDepartment = "electrical";
    detection = "Street lighting failure";
    damageClass = "Electrical outage";
  } else if (
    text.includes("waste") ||
    text.includes("garbage") ||
    text.includes("bin")
  ) {
    suggestedDepartment = "sanitation";
    detection = "Solid waste backlog";
    damageClass = "Sanitation service gap";
  } else if (text.includes("footpath") || text.includes("railing")) {
    suggestedDepartment = "town-planning";
    detection = "Pedestrian infrastructure damage";
    damageClass = "Street furniture / footpath defect";
  } else if (
    text.includes("pothole") ||
    text.includes("manhole") ||
    text.includes("road")
  ) {
    suggestedDepartment = "roads";
    detection = "Road surface or safety hazard";
    damageClass = "Pavement / carriageway defect";
    severity =
      text.includes("manhole") || text.includes("critical") ? "critical" : "high";
  }

  return {
    detection,
    damageClass,
    severity,
    suggestedDepartment,
    suggestedPriority: severity,
  };
}

export function fallbackAnalysis(input: {
  title: string;
  description: string;
  category: string;
}): AiAnalysis {
  const base = inferFromText(input);
  return {
    ...base,
    summary: `AMC triage brief for "${input.title}": ${base.detection.toLowerCase()} in Ahmedabad. Recommended routing to ${base.suggestedDepartment} with ${base.severity} priority based on citizen description.`,
    confidence: 0.7,
    standardsNote:
      "Offline heuristic analysis used because Exa AI was unavailable.",
  };
}

function extractPriority(text: string, fallback: Priority): Priority {
  const lower = text.toLowerCase();
  for (const priority of priorities) {
    if (lower.includes(`severity: ${priority}`) || lower.includes(`severity ${priority}`)) {
      return priority;
    }
    if (lower.includes(priority) && (lower.includes("priority") || lower.includes("severity"))) {
      return priority;
    }
  }
  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("low")) return "low";
  return fallback;
}

function extractDepartment(text: string, fallback: DepartmentId): DepartmentId {
  const lower = text.toLowerCase();
  if (lower.includes("electrical") || lower.includes("street light")) return "electrical";
  if (lower.includes("sanitation") || lower.includes("solid waste")) return "sanitation";
  if (lower.includes("town planning") || lower.includes("town-planning")) {
    return "town-planning";
  }
  if (lower.includes("drainage") || lower.includes("storm water") || lower.includes("sewer")) {
    return "drainage";
  }
  if (lower.includes("water supply") || lower.includes(" pipeline")) return "water";
  if (lower.includes("roads") || lower.includes("pavement") || lower.includes("pothole")) {
    return "roads";
  }
  for (const dept of departments) {
    if (lower.includes(dept.replace("-", " ")) || lower.includes(dept)) return dept;
  }
  return fallback;
}

/** Exa-only infrastructure triage for AMC reports. */
export async function analyzeInfrastructure(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
}): Promise<AiAnalysis> {
  const heuristic = fallbackAnalysis(input);

  try {
    const [triage, standards] = await Promise.all([
      answer({
        query: [
          "Analyze this Ahmedabad Municipal Corporation (AMC) citizen infrastructure report.",
          "Respond with short labeled lines for: Detection, Damage class, Severity (low|medium|high|critical), Suggested department (roads|water|drainage|electrical|sanitation|town-planning), Suggested priority, Officer summary.",
          `Title: ${input.title}`,
          `Category: ${input.category}`,
          `Ward: ${input.ward ?? "Ahmedabad"}`,
          `Description: ${input.description}`,
        ].join("\n"),
      }),
      research({
        topic: `${input.category} municipal infrastructure repair standards India ${heuristic.damageClass}`,
        numResults: 4,
      }).catch(() => null),
    ]);

    const text = triage.answer;
    const severity = extractPriority(text, heuristic.severity);
    const suggestedDepartment = extractDepartment(
      text,
      heuristic.suggestedDepartment
    );

    const detectionMatch = text.match(/detection[:\-\s]+(.+)/i);
    const damageMatch = text.match(/damage class[:\-\s]+(.+)/i);
    const summaryMatch =
      text.match(/officer summary[:\-\s]+([\s\S]+)/i) ||
      text.match(/summary[:\-\s]+([\s\S]+)/i);

    return {
      detection: detectionMatch?.[1]?.split("\n")[0]?.trim() || heuristic.detection,
      damageClass: damageMatch?.[1]?.split("\n")[0]?.trim() || heuristic.damageClass,
      severity,
      suggestedDepartment,
      suggestedPriority: extractPriority(text, severity),
      summary: (summaryMatch?.[1] || text).trim().slice(0, 900),
      confidence: 0.86,
      standardsNote: standards?.answer.slice(0, 420) || undefined,
    };
  } catch {
    return heuristic;
  }
}

export const ai = {
  analyzeInfrastructure,
  fallbackAnalysis,
};
