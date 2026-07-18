import { answer, research } from "@/lib/ai/exa";
import type {
  AiAnalysis,
  AuthenticityVerdict,
  DepartmentId,
  Priority,
} from "@/types";

const departments: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

const priorities: Priority[] = ["low", "medium", "high", "critical"];

function priorityToScore(priority: Priority): number {
  if (priority === "critical") return 92;
  if (priority === "high") return 74;
  if (priority === "medium") return 52;
  return 28;
}

function scoreToPriority(score: number): Priority {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function inferAuthenticity(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
}): { authenticity: AuthenticityVerdict; authenticityScore: number } {
  const text = `${input.title} ${input.description}`.toLowerCase();
  let score = 0.78;
  let authenticity: AuthenticityVerdict = "likely_true";

  const spamHints = [
    "test report",
    "asdf",
    "fake",
    "joke",
    "lorem",
    "spam",
    "ignore this",
    "xxx",
    "not real",
  ];
  if (spamHints.some((h) => text.includes(h))) {
    return { authenticity: "possibly_fake", authenticityScore: 0.88 };
  }

  if (input.description.trim().length < 25) {
    score -= 0.2;
    authenticity = "uncertain";
  }
  if (!/\d|near|road|cross|ward|bridge|lake|society|brts|highway|gali|sector/i.test(text)) {
    score -= 0.12;
    authenticity = authenticity === "likely_true" ? "uncertain" : authenticity;
  }
  if (
    input.ward &&
    !text.includes(input.ward.toLowerCase()) &&
    input.description.length < 40
  ) {
    score -= 0.08;
  }
  if (
    (input.category === "lighting" && !/light|lamp|dark|outage/.test(text)) ||
    (input.category === "water" && !/water|leak|pressure|pipe|supply/.test(text)) ||
    (input.category === "drainage" &&
      !/drain|flood|sewage|waterlog|clog/.test(text))
  ) {
    score -= 0.15;
    authenticity = "uncertain";
  }
  if (
    /pothole|manhole|waterlog|sewage|streetlight|overflow|broken|leak/.test(text) &&
    input.description.length >= 40
  ) {
    score += 0.1;
    authenticity = "likely_true";
  }

  score = Math.max(0.35, Math.min(0.95, score));
  if (score < 0.55) authenticity = "possibly_fake";
  else if (score < 0.68) authenticity = "uncertain";

  return { authenticity, authenticityScore: Number(score.toFixed(2)) };
}

function inferFromText(input: {
  title: string;
  description: string;
  category: string;
}): {
  detection: string;
  damageClass: string;
  severity: Priority;
  suggestedDepartment: DepartmentId;
  suggestedPriority: Priority;
  issueDetected: string;
} {
  const text = `${input.title} ${input.description} ${input.category}`.toLowerCase();
  let suggestedDepartment: DepartmentId = "roads";
  let severity: Priority = "medium";
  let detection = "General urban infrastructure issue";
  let damageClass = "Unclassified surface defect";
  let issueDetected = "Unspecified civic infrastructure complaint";

  if (text.includes("water") || text.includes("leak") || text.includes("pressure")) {
    suggestedDepartment = "water";
    detection = "Water supply anomaly";
    damageClass = "Utility leakage / pressure failure";
    issueDetected = "Water supply leakage or low pressure";
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
    issueDetected = "Drainage blockage or waterlogging";
    severity =
      text.includes("flood") || text.includes("underpass") ? "critical" : "high";
  } else if (text.includes("light") || text.includes("lamp")) {
    suggestedDepartment = "electrical";
    detection = "Street lighting failure";
    damageClass = "Electrical outage";
    issueDetected = "Non-functional street lighting";
  } else if (
    text.includes("waste") ||
    text.includes("garbage") ||
    text.includes("bin")
  ) {
    suggestedDepartment = "sanitation";
    detection = "Solid waste backlog";
    damageClass = "Sanitation service gap";
    issueDetected = "Overflowing waste or missed collection";
  } else if (text.includes("footpath") || text.includes("railing")) {
    suggestedDepartment = "town-planning";
    detection = "Pedestrian infrastructure damage";
    damageClass = "Street furniture / footpath defect";
    issueDetected = "Damaged footpath or pedestrian railing";
  } else if (
    text.includes("pothole") ||
    text.includes("manhole") ||
    text.includes("road")
  ) {
    suggestedDepartment = "roads";
    detection = "Road surface or safety hazard";
    damageClass = "Pavement / carriageway defect";
    issueDetected = text.includes("manhole")
      ? "Open or missing manhole cover"
      : "Road pothole or pavement damage";
    severity =
      text.includes("manhole") || text.includes("critical") ? "critical" : "high";
  }

  return {
    detection,
    damageClass,
    severity,
    suggestedDepartment,
    suggestedPriority: severity,
    issueDetected,
  };
}

export function fallbackAnalysis(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
}): AiAnalysis {
  const base = inferFromText(input);
  const authenticity = inferAuthenticity(input);
  const priorityScore = priorityToScore(base.severity);

  return {
    ...base,
    summary: `AMC triage brief for "${input.title}": ${base.issueDetected} in Ahmedabad (${input.ward ?? "citywide"}). Authenticity: ${authenticity.authenticity.replace("_", " ")}. Recommended routing to ${base.suggestedDepartment} with priority score ${priorityScore}/100.`,
    confidence: authenticity.authenticity === "possibly_fake" ? 0.55 : 0.72,
    authenticity: authenticity.authenticity,
    authenticityScore: authenticity.authenticityScore,
    priorityScore,
    standardsNote:
      "Offline heuristic analysis used because Exa AI was unavailable.",
  };
}

function extractPriority(text: string, fallback: Priority): Priority {
  const lower = text.toLowerCase();
  for (const priority of priorities) {
    if (
      lower.includes(`severity: ${priority}`) ||
      lower.includes(`priority: ${priority}`) ||
      lower.includes(`suggested priority: ${priority}`)
    ) {
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
  if (lower.includes("electrical") || lower.includes("street light")) {
    return "electrical";
  }
  if (lower.includes("sanitation") || lower.includes("solid waste")) {
    return "sanitation";
  }
  if (lower.includes("town planning") || lower.includes("town-planning")) {
    return "town-planning";
  }
  if (
    lower.includes("drainage") ||
    lower.includes("storm water") ||
    lower.includes("sewer")
  ) {
    return "drainage";
  }
  if (lower.includes("water supply") || lower.includes(" pipeline")) {
    return "water";
  }
  if (
    lower.includes("roads") ||
    lower.includes("pavement") ||
    lower.includes("pothole")
  ) {
    return "roads";
  }
  for (const dept of departments) {
    if (lower.includes(dept.replace("-", " ")) || lower.includes(dept)) {
      return dept;
    }
  }
  return fallback;
}

function extractNumber(text: string, patterns: RegExp[], fallback: number): number {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1]);
      if (!Number.isNaN(value)) return value;
    }
  }
  return fallback;
}

function extractAuthenticity(
  text: string,
  fallback: AuthenticityVerdict
): AuthenticityVerdict {
  const lower = text.toLowerCase();
  if (
    lower.includes("possibly_fake") ||
    lower.includes("possibly fake") ||
    lower.includes("likely fake") ||
    lower.includes("fabricated") ||
    lower.includes("spam")
  ) {
    return "possibly_fake";
  }
  if (
    lower.includes("likely_true") ||
    lower.includes("likely true") ||
    lower.includes("genuine") ||
    lower.includes("authentic")
  ) {
    return "likely_true";
  }
  if (lower.includes("uncertain")) return "uncertain";
  return fallback;
}

function extractLabeled(text: string, label: string): string | null {
  const regex = new RegExp(`${label}[:\\-\\s]+(.+)`, "i");
  const match = text.match(regex);
  return match?.[1]?.split("\n")[0]?.trim() || null;
}

/** Exa-only infrastructure triage + authenticity scoring for AMC reports. */
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
          "You are verifying a citizen infrastructure report for Ahmedabad Municipal Corporation (AMC).",
          "Assess if the report seems genuine or possibly fake/spam, detect the real issue, and score priority.",
          "Respond with short labeled lines exactly like:",
          "Authenticity: likely_true | possibly_fake | uncertain",
          "AuthenticityScore: 0-100",
          "IssueDetected: short phrase",
          "Detection: short phrase",
          "Damage class: short phrase",
          "PriorityScore: 0-100",
          "Severity: low|medium|high|critical",
          "Suggested department: roads|water|drainage|electrical|sanitation|town-planning",
          "Suggested priority: low|medium|high|critical",
          "Confidence: 0-100",
          "Officer summary: 2-3 sentences",
          "",
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
    const authenticity = extractAuthenticity(text, heuristic.authenticity);
    const authenticityScorePct = extractNumber(
      text,
      [
        /authenticityscore[:\-\s]+(\d{1,3})/i,
        /authenticity score[:\-\s]+(\d{1,3})/i,
      ],
      Math.round(heuristic.authenticityScore * 100)
    );
    const priorityScore = extractNumber(
      text,
      [/priorityscore[:\-\s]+(\d{1,3})/i, /priority score[:\-\s]+(\d{1,3})/i],
      heuristic.priorityScore
    );
    const confidencePct = extractNumber(
      text,
      [/confidence[:\-\s]+(\d{1,3})/i],
      Math.round(heuristic.confidence * 100)
    );
    const severity = extractPriority(text, scoreToPriority(priorityScore));
    const suggestedDepartment = extractDepartment(
      text,
      heuristic.suggestedDepartment
    );
    const issueDetected =
      extractLabeled(text, "IssueDetected") ||
      extractLabeled(text, "Issue detected") ||
      heuristic.issueDetected;

    const localAuth = inferAuthenticity(input);
    const blendedAuthScore = Number(
      (
        (Math.min(100, authenticityScorePct) / 100) * 0.65 +
        localAuth.authenticityScore * 0.35
      ).toFixed(2)
    );

    return {
      detection:
        extractLabeled(text, "Detection") || heuristic.detection,
      damageClass:
        extractLabeled(text, "Damage class") || heuristic.damageClass,
      severity,
      suggestedDepartment,
      suggestedPriority: extractPriority(text, severity),
      summary: (
        extractLabeled(text, "Officer summary") ||
        extractLabeled(text, "Summary") ||
        text
      )
        .trim()
        .slice(0, 900),
      confidence: Math.min(0.99, Math.max(0.35, confidencePct / 100)),
      authenticity:
        authenticity === "likely_true" && localAuth.authenticity === "possibly_fake"
          ? "uncertain"
          : authenticity,
      authenticityScore: blendedAuthScore,
      priorityScore: Math.min(100, Math.max(0, priorityScore)),
      issueDetected,
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
