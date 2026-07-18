import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiAnalysis, DepartmentId, Priority } from "@/types";

const DEFAULT_TIMEOUT_MS = 25_000;

function requireGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local or Vercel environment variables."
    );
  }
  return key;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

const departments: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

const priorities: Priority[] = ["low", "medium", "high", "critical"];

function normalizeAnalysis(data: Record<string, unknown>): AiAnalysis {
  const severityRaw = String(data.severity ?? data.suggestedPriority ?? "medium");
  const deptRaw = String(data.suggestedDepartment ?? "roads");
  const severity = priorities.includes(severityRaw as Priority)
    ? (severityRaw as Priority)
    : "medium";
  const suggestedDepartment = departments.includes(deptRaw as DepartmentId)
    ? (deptRaw as DepartmentId)
    : "roads";

  return {
    detection: String(data.detection ?? "Infrastructure anomaly detected"),
    damageClass: String(data.damageClass ?? "General infrastructure damage"),
    severity,
    summary: String(
      data.summary ??
        "Automated assessment generated for Ahmedabad Municipal Corporation triage."
    ),
    suggestedDepartment,
    suggestedPriority: priorities.includes(
      String(data.suggestedPriority ?? severity) as Priority
    )
      ? (String(data.suggestedPriority ?? severity) as Priority)
      : severity,
    confidence: Math.min(
      0.99,
      Math.max(0.5, Number(data.confidence ?? 0.82) || 0.82)
    ),
    standardsNote:
      typeof data.standardsNote === "string" ? data.standardsNote : undefined,
  };
}

export function fallbackAnalysis(input: {
  title: string;
  description: string;
  category: string;
}): AiAnalysis {
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
    severity = text.includes("flood") || text.includes("underpass") ? "critical" : "high";
  } else if (text.includes("light") || text.includes("lamp")) {
    suggestedDepartment = "electrical";
    detection = "Street lighting failure";
    damageClass = "Electrical outage";
  } else if (text.includes("waste") || text.includes("garbage") || text.includes("bin")) {
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
    summary: `AMC triage brief for "${input.title}": ${detection.toLowerCase()} in Ahmedabad. Recommended routing to ${suggestedDepartment} with ${severity} priority based on citizen description.`,
    suggestedDepartment,
    suggestedPriority: severity,
    confidence: 0.72,
    standardsNote:
      "Heuristic offline analysis used because GEMINI_API_KEY is unavailable.",
  };
}

export async function analyzeInfrastructure(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<AiAnalysis> {
  try {
    const apiKey = requireGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an urban infrastructure analyst for Ahmedabad Municipal Corporation (AMC), India.
Analyze the citizen report and return ONLY compact JSON with keys:
detection, damageClass, severity (low|medium|high|critical), summary, suggestedDepartment (roads|water|drainage|electrical|sanitation|town-planning), suggestedPriority (low|medium|high|critical), confidence (0-1), standardsNote.

Report title: ${input.title}
Category: ${input.category}
Ward: ${input.ward ?? "Ahmedabad"}
Description: ${input.description}`;

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> =
      [{ text: prompt }];

    if (input.imageBase64 && input.mimeType) {
      parts.push({
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType,
        },
      });
    }

    const result = await withTimeout(
      model.generateContent({ contents: [{ role: "user", parts }] }),
      DEFAULT_TIMEOUT_MS
    );

    const text = result.response.text();
    return normalizeAnalysis(extractJson(text));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("GEMINI_API_KEY") === false
    ) {
      // graceful degrade
    }
    return fallbackAnalysis(input);
  }
}

export async function generateReportSummary(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
}): Promise<string> {
  const analysis = await analyzeInfrastructure(input);
  return analysis.summary;
}

export const gemini = {
  analyzeInfrastructure,
  generateReportSummary,
  fallbackAnalysis,
};
