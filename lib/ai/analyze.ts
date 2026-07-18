import { answer, research } from "@/lib/ai/exa";
import {
  scanReportImage,
  type VisualSignals,
} from "@/lib/ai/image-scan";
import type {
  AiAnalysis,
  AuthenticityVerdict,
  DepartmentId,
  ImageRelevance,
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

function looksGibberish(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return true;
  const letters = text.replace(/[^a-z]/g, "");
  if (letters.length < 6) return true;
  const vowels = (letters.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowels / letters.length;
  if (vowelRatio < 0.22) return true;
  if (
    /asdf|qwer|zxcv|hjkl|mhvb|frgh|dummy|test123|aaaa|xxxx/i.test(text)
  ) {
    return true;
  }
  const words = text.split(/\s+/).filter((w) => w.replace(/[^a-z]/g, "").length > 1);
  if (words.length <= 2 && vowelRatio < 0.3 && letters.length >= 8) return true;
  // Dense consonant smash without real civic vocabulary
  if (
    !/\b(road|pothole|drain|water|light|waste|ward|near|street|bridge|flood|leak|manhole|footpath)\b/i.test(
      text
    ) &&
    vowelRatio < 0.28 &&
    letters.length >= 10
  ) {
    return true;
  }
  return false;
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

  if (looksGibberish(input.title) || looksGibberish(input.description)) {
    return {
      authenticity: "possibly_fake",
      authenticityScore: 0.9,
    };
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

  // Potholes / pavement defects always route to Roads — not Drainage.
  if (
    text.includes("pothole") ||
    text.includes("asphalt") ||
    text.includes("pavement") ||
    text.includes("carriageway") ||
    text.includes("road crater") ||
    (text.includes("road") &&
      (text.includes("crack") || text.includes("surface") || text.includes("repair")))
  ) {
    suggestedDepartment = "roads";
    detection = "Road surface or safety hazard";
    damageClass = "Pavement / carriageway defect";
    issueDetected = "Road pothole or pavement damage";
    severity =
      text.includes("deep") || text.includes("cluster") || text.includes("critical")
        ? "critical"
        : "high";
  } else if (text.includes("water") || text.includes("leak") || text.includes("pressure")) {
    suggestedDepartment = "water";
    detection = "Water supply anomaly";
    damageClass = "Utility leakage / pressure failure";
    issueDetected = "Water supply leakage or low pressure";
    severity = "high";
  } else if (
    text.includes("drain") ||
    text.includes("flood") ||
    text.includes("sewage") ||
    text.includes("waterlog") ||
    text.includes("sinkhole") ||
    text.includes("cave-in") ||
    text.includes("cave in")
  ) {
    // Sinkholes / cave-ins often stem from underground drain failure → Drainage.
    // Plain potholes are handled above under Roads.
    suggestedDepartment = "drainage";
    detection = "Drainage obstruction or sewer surcharge";
    damageClass = "Storm-water / sewer failure";
    issueDetected =
      text.includes("sinkhole") || text.includes("cave")
        ? "Sinkhole / cave-in from subsurface washout"
        : "Drainage blockage or waterlogging";
    severity =
      text.includes("flood") ||
      text.includes("underpass") ||
      text.includes("sinkhole") ||
      text.includes("cave")
        ? "critical"
        : "high";
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
  } else if (text.includes("manhole") || text.includes("road")) {
    suggestedDepartment = text.includes("manhole") ? "drainage" : "roads";
    detection = "Road surface or safety hazard";
    damageClass = text.includes("manhole")
      ? "Manhole / chamber safety defect"
      : "Pavement / carriageway defect";
    issueDetected = text.includes("manhole")
      ? "Open or missing manhole cover"
      : "Road surface damage";
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

function confidenceFromSignals(input: {
  title: string;
  description: string;
  authenticityScore: number;
  authenticity: AuthenticityVerdict;
  severity: Priority;
  imageRelevant?: ImageRelevance;
  imageRelevanceScore?: number;
}): number {
  let confidence = 0.62 + input.authenticityScore * 0.25;
  if (input.description.trim().length >= 80) confidence += 0.06;
  if (input.description.trim().length < 30) confidence -= 0.1;
  if (looksGibberish(input.title) || looksGibberish(input.description)) {
    confidence = Math.min(confidence, 0.38);
  }
  if (/\d|sg highway|brts|maninagar|cg road|vastrapur|thaltej/i.test(
    `${input.title} ${input.description}`
  )) {
    confidence += 0.05;
  }
  if (input.severity === "critical" || input.severity === "low") {
    confidence += 0.03;
  }
  if (input.authenticity === "possibly_fake") confidence = Math.min(confidence, 0.42);
  if (input.authenticity === "uncertain") confidence -= 0.08;
  if (input.imageRelevant === "not_relevant") {
    confidence = Math.min(confidence, 0.4);
  } else if (input.imageRelevant === "uncertain") {
    confidence = Math.min(confidence, 0.62);
  }
  if (typeof input.imageRelevanceScore === "number") {
    confidence = confidence * 0.7 + input.imageRelevanceScore * 0.3;
  }
  return Number(Math.max(0.22, Math.min(0.96, confidence)).toFixed(2));
}

export function fallbackAnalysis(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
  imageScan?: Awaited<ReturnType<typeof scanReportImage>>;
}): AiAnalysis {
  const base = inferFromText(input);
  const authenticity = inferAuthenticity(input);
  const scan = input.imageScan;
  const suggestedDepartment =
    scan?.imageRelevant === "relevant"
      ? scan.imageDepartmentHint
      : base.suggestedDepartment;
  const issueDetected =
    scan?.imageRelevant === "relevant" && scan.imageIssueHint
      ? scan.imageIssueHint
      : base.issueDetected;
  const priorityScore = priorityToScore(base.severity);
  const confidence = confidenceFromSignals({
    title: input.title,
    description: input.description,
    authenticityScore: authenticity.authenticityScore,
    authenticity: authenticity.authenticity,
    severity: base.severity,
    imageRelevant: scan?.imageRelevant,
    imageRelevanceScore: scan?.imageRelevanceScore,
  });

  return {
    ...base,
    suggestedDepartment,
    suggestedPriority: base.severity,
    issueDetected,
    summary: `AMC triage brief for "${input.title}": ${issueDetected} in Ahmedabad (${input.ward ?? "citywide"}). Predicted risk: ${base.severity}. Authenticity: ${authenticity.authenticity.replace("_", " ")}. Confidence ${Math.round(confidence * 100)}%. Photo: ${scan?.imageRelevant ?? "not scanned"} (${Math.round((scan?.imageRelevanceScore ?? 0) * 100)}%). Recommended routing to ${suggestedDepartment} with priority score ${priorityScore}/100.`,
    confidence,
    authenticity: authenticity.authenticity,
    authenticityScore: authenticity.authenticityScore,
    priorityScore,
    standardsNote:
      "Offline heuristic analysis used because Exa AI was unavailable.",
    imageRelevant: scan?.imageRelevant,
    imageRelevanceScore: scan?.imageRelevanceScore,
    imageScene: scan?.imageScene,
    imageDepartmentHint: scan?.imageDepartmentHint,
    imageIssueHint: scan?.imageIssueHint,
    imageNotes: scan?.imageNotes,
  };
}

function extractPriority(text: string, fallback: Priority): Priority {
  const lower = text.toLowerCase();
  for (const priority of priorities) {
    if (
      lower.includes(`risklevel: ${priority}`) ||
      lower.includes(`risk level: ${priority}`) ||
      lower.includes(`risk: ${priority}`) ||
      lower.includes(`severity: ${priority}`) ||
      lower.includes(`priority: ${priority}`) ||
      lower.includes(`suggested priority: ${priority}`)
    ) {
      return priority;
    }
  }
  if (/\bcritical\b/.test(lower)) return "critical";
  if (/\bmedium\b/.test(lower)) return "medium";
  if (/\blow\b/.test(lower)) return "low";
  if (/\bhigh\b/.test(lower) && !lower.includes("highway")) return "high";
  return fallback;
}

function extractDepartment(text: string, fallback: DepartmentId): DepartmentId {
  const lower = text.toLowerCase();
  // Explicit pavement language wins over a generic "drainage" mention in the summary.
  if (
    lower.includes("pothole") ||
    lower.includes("pavement") ||
    lower.includes("asphalt") ||
    lower.includes("carriageway")
  ) {
    return "roads";
  }
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
    lower.includes("sewer") ||
    lower.includes("sinkhole") ||
    lower.includes("cave-in")
  ) {
    return "drainage";
  }
  if (lower.includes("water supply") || lower.includes(" pipeline")) {
    return "water";
  }
  if (lower.includes("roads") || lower.includes("road department")) {
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

/** Exa-only infrastructure triage + authenticity + photo relevance for AMC reports. */
export async function analyzeInfrastructure(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
  imageUrl?: string;
  visualSignals?: VisualSignals;
}): Promise<AiAnalysis> {
  const imageScan = await scanReportImage({
    title: input.title,
    description: input.description,
    category: input.category,
    ward: input.ward,
    imageUrl: input.imageUrl,
    visualSignals: input.visualSignals,
  });
  const heuristic = fallbackAnalysis({ ...input, imageScan });

  try {
    const [triage, standards] = await Promise.all([
      answer({
        query: [
          "You are verifying a citizen infrastructure report for Ahmedabad Municipal Corporation (AMC).",
          "Predict risk level (critical / high / medium / low), model confidence, authenticity, and routing.",
          "Critical = imminent safety / major service failure. Medium = notable inconvenience needing scheduled fix.",
          "Department rules: pothole / asphalt / pavement damage → roads. Clogged drain / waterlogging / sewage / sinkhole cave-in → drainage. Do NOT send potholes to drainage.",
          "Use photo scan signals when present. If photo is not_relevant, lower authenticity and flag mismatch.",
          "Respond with short labeled lines exactly like:",
          "Authenticity: likely_true | possibly_fake | uncertain",
          "AuthenticityScore: 0-100",
          "IssueDetected: short phrase",
          "Detection: short phrase",
          "Damage class: short phrase",
          "RiskLevel: low|medium|high|critical",
          "PriorityScore: 0-100",
          "Severity: low|medium|high|critical",
          "Suggested department: roads|water|drainage|electrical|sanitation|town-planning",
          "Suggested priority: low|medium|high|critical",
          "Confidence: 0-100",
          "Officer summary: 2-3 sentences including predicted risk, photo relevance, and confidence",
          "",
          `Title: ${input.title}`,
          `Category: ${input.category}`,
          `Ward: ${input.ward ?? "Ahmedabad"}`,
          `Description: ${input.description}`,
          `PhotoRelevant: ${imageScan.imageRelevant}`,
          `PhotoRelevanceScore: ${Math.round(imageScan.imageRelevanceScore * 100)}`,
          `PhotoScene: ${imageScan.imageScene}`,
          `PhotoIssue: ${imageScan.imageIssueHint}`,
          `PhotoDepartmentHint: ${imageScan.imageDepartmentHint}`,
          `PhotoNotes: ${imageScan.imageNotes}`,
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
    const riskLevel = extractPriority(text, scoreToPriority(priorityScore));
    const severity = extractPriority(text, riskLevel);
    const suggestedPriority = extractPriority(text, severity);
    let suggestedDepartment = extractDepartment(
      text,
      imageScan.imageRelevant === "relevant"
        ? imageScan.imageDepartmentHint
        : heuristic.suggestedDepartment
    );
    if (
      imageScan.imageRelevant === "relevant" &&
      imageScan.imageRelevanceScore >= 0.65
    ) {
      suggestedDepartment = imageScan.imageDepartmentHint;
    }
    const issueDetected =
      extractLabeled(text, "IssueDetected") ||
      extractLabeled(text, "Issue detected") ||
      (imageScan.imageRelevant === "relevant"
        ? imageScan.imageIssueHint
        : heuristic.issueDetected);

    const localAuth = inferAuthenticity(input);
    let blendedAuthScore = Number(
      (
        (Math.min(100, authenticityScorePct) / 100) * 0.65 +
        localAuth.authenticityScore * 0.35
      ).toFixed(2)
    );
    if (localAuth.authenticity === "possibly_fake") {
      blendedAuthScore = Number(Math.min(blendedAuthScore, 0.35).toFixed(2));
    }
    if (imageScan.imageRelevant === "not_relevant") {
      blendedAuthScore = Number(Math.min(blendedAuthScore, 0.42).toFixed(2));
    }
    const modelConfidence = Math.min(
      0.99,
      Math.max(0.22, confidencePct / 100)
    );
    let blendedConfidence = Number(
      (
        modelConfidence * 0.45 +
        confidenceFromSignals({
          title: input.title,
          description: input.description,
          authenticityScore: blendedAuthScore,
          authenticity:
            localAuth.authenticity === "possibly_fake"
              ? "possibly_fake"
              : authenticity === "likely_true" &&
                  localAuth.authenticity === "uncertain"
                ? "uncertain"
                : authenticity,
          severity: suggestedPriority,
          imageRelevant: imageScan.imageRelevant,
          imageRelevanceScore: imageScan.imageRelevanceScore,
        }) *
          0.55
      ).toFixed(2)
    );
    if (localAuth.authenticity === "possibly_fake") {
      blendedConfidence = Math.min(blendedConfidence, 0.4);
    }
    if (imageScan.imageRelevant === "not_relevant") {
      blendedConfidence = Math.min(blendedConfidence, 0.38);
    }
    const alignedScore = priorityToScore(suggestedPriority);
    const finalPriorityScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(priorityScore * 0.7 + alignedScore * 0.3)
      )
    );

    const authenticityFinal =
      localAuth.authenticity === "possibly_fake"
        ? "possibly_fake"
        : imageScan.imageRelevant === "not_relevant"
          ? "uncertain"
          : authenticity;

    return {
      detection:
        extractLabeled(text, "Detection") || heuristic.detection,
      damageClass:
        extractLabeled(text, "Damage class") || heuristic.damageClass,
      severity: suggestedPriority,
      suggestedDepartment,
      suggestedPriority,
      summary: (
        extractLabeled(text, "Officer summary") ||
        extractLabeled(text, "Summary") ||
        text
      )
        .trim()
        .slice(0, 900),
      confidence: blendedConfidence,
      authenticity: authenticityFinal,
      authenticityScore: blendedAuthScore,
      priorityScore: finalPriorityScore,
      issueDetected,
      standardsNote: standards?.answer.slice(0, 420) || undefined,
      imageRelevant: imageScan.imageRelevant,
      imageRelevanceScore: imageScan.imageRelevanceScore,
      imageScene: imageScan.imageScene,
      imageDepartmentHint: imageScan.imageDepartmentHint,
      imageIssueHint: imageScan.imageIssueHint,
      imageNotes: imageScan.imageNotes,
    };
  } catch {
    return heuristic;
  }
}

export const ai = {
  analyzeInfrastructure,
  fallbackAnalysis,
};
