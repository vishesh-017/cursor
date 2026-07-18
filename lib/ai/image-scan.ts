import { answer } from "@/lib/ai/exa";
import type { DepartmentId, ImageRelevance, Priority } from "@/types";

export type VisualSignals = {
  width: number;
  height: number;
  brightness: number;
  variance: number;
  asphaltScore: number;
  vegetationScore: number;
  waterScore: number;
  skinScore: number;
  skyScore: number;
  edgeEnergy: number;
  fileName?: string;
};

export type ImageScanResult = {
  imageRelevant: ImageRelevance;
  imageRelevanceScore: number;
  imageScene: string;
  imageDepartmentHint: DepartmentId;
  imageIssueHint: string;
  imageNotes: string;
};

const departments: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function heuristicImageScan(
  signals: VisualSignals | undefined,
  input: { title: string; description: string; category: string }
): ImageScanResult {
  const text = `${input.title} ${input.description} ${input.category} ${signals?.fileName ?? ""}`.toLowerCase();

  if (!signals) {
    return {
      imageRelevant: "uncertain",
      imageRelevanceScore: 0.45,
      imageScene: "No photo evidence attached",
      imageDepartmentHint: text.includes("pothole") ? "roads" : "roads",
      imageIssueHint: "Text-only report — photo recommended",
      imageNotes: "Upload a site photo so AI can verify civic relevance.",
    };
  }

  const {
    brightness,
    variance,
    asphaltScore,
    vegetationScore,
    waterScore,
    skinScore,
    skyScore,
    edgeEnergy,
  } = signals;

  let relevance: ImageRelevance = "relevant";
  let score = 0.55;
  let department: DepartmentId = "roads";
  let scene = "Outdoor civic scene";
  let issue = "Possible infrastructure defect";

  const blank = variance < 0.012 && edgeEnergy < 0.08;
  // Portrait / selfie: skin tones dominate and little road/asphalt texture
  const selfieLike =
    (skinScore > 0.18 && asphaltScore < 0.16) ||
    (skinScore > 0.24 && asphaltScore < 0.22 && edgeEnergy < 0.22);
  const parkOnly = vegetationScore > 0.42 && asphaltScore < 0.1 && waterScore < 0.12;
  const darkUseless = brightness < 0.12 && edgeEnergy < 0.1;

  if (blank || darkUseless) {
    relevance = "not_relevant";
    score = 0.18;
    scene = "Blank / unusable image";
    issue = "Photo does not show an infrastructure issue";
  } else if (selfieLike) {
    relevance = "not_relevant";
    score = 0.28;
    scene = "Person / selfie dominant";
    issue = "Image appears unrelated to municipal infrastructure";
  } else if (parkOnly && !/pothole|drain|road|leak|light|waste|footpath/.test(text)) {
    relevance = "uncertain";
    score = 0.42;
    scene = "Vegetation-heavy scene";
    issue = "Unclear civic defect in frame";
  } else {
    score = 0.62 + asphaltScore * 0.18 + edgeEnergy * 0.12;
    if (asphaltScore > 0.22 || /pothole|road|pavement|crack/.test(text)) {
      department = "roads";
      scene = "Road / pavement surface";
      issue = asphaltScore > 0.25 ? "Pavement damage / pothole-like surface" : "Road corridor issue";
      score += 0.08;
    } else if (waterScore > 0.2 || /flood|waterlog|drain|sewage|sinkhole/.test(text)) {
      department = "drainage";
      scene = "Water / drainage condition";
      issue = "Waterlogging or drainage failure";
      score += 0.08;
    } else if (/leak|pipe|pressure|water supply/.test(text) && waterScore > 0.1) {
      department = "water";
      scene = "Utility water evidence";
      issue = "Water supply leakage indicators";
    } else if (skyScore > 0.2 && brightness < 0.35 && /light|lamp|dark/.test(text)) {
      department = "electrical";
      scene = "Low-light street corridor";
      issue = "Possible street lighting failure";
    } else if (/waste|garbage|bin/.test(text)) {
      department = "sanitation";
      scene = "Sanitation / waste area";
      issue = "Solid waste backlog";
    } else if (/footpath|railing/.test(text)) {
      department = "town-planning";
      scene = "Pedestrian infrastructure";
      issue = "Footpath or street furniture damage";
    }

    if (score >= 0.55) relevance = "relevant";
    else if (score >= 0.4) relevance = "uncertain";
    else relevance = "not_relevant";
  }

  return {
    imageRelevant: relevance,
    imageRelevanceScore: Number(clamp01(score).toFixed(2)),
    imageScene: scene,
    imageDepartmentHint: department,
    imageIssueHint: issue,
    imageNotes: `Visual signals · asphalt ${Math.round(asphaltScore * 100)}% · water ${Math.round(waterScore * 100)}% · vegetation ${Math.round(vegetationScore * 100)}% · edges ${Math.round(edgeEnergy * 100)}%`,
  };
}

function extractDept(text: string, fallback: DepartmentId): DepartmentId {
  const lower = text.toLowerCase();
  if (lower.includes("pothole") || lower.includes("pavement") || lower.includes("roads")) {
    return "roads";
  }
  for (const d of departments) {
    if (lower.includes(d.replace("-", " ")) || lower.includes(d)) return d;
  }
  return fallback;
}

function extractRelevance(text: string, fallback: ImageRelevance): ImageRelevance {
  const lower = text.toLowerCase();
  if (
    lower.includes("not_relevant") ||
    lower.includes("not relevant") ||
    lower.includes("irrelevant")
  ) {
    return "not_relevant";
  }
  if (lower.includes("uncertain")) return "uncertain";
  if (lower.includes("relevant")) return "relevant";
  return fallback;
}

/** Combine pixel heuristics with Exa judgment for project relevance + department. */
export async function scanReportImage(input: {
  title: string;
  description: string;
  category: string;
  ward?: string;
  imageUrl?: string;
  visualSignals?: VisualSignals;
}): Promise<ImageScanResult> {
  const local = heuristicImageScan(input.visualSignals, input);

  if (!input.imageUrl && !input.visualSignals) {
    return local;
  }

  try {
    const result = await answer({
      query: [
        "You assess photo evidence for Ahmedabad Municipal Corporation (Urbanexus) civic infrastructure reports.",
        "Decide if the photo is relevant to municipal infrastructure (roads, water, drainage, lighting, waste, footpath).",
        "Mark not_relevant for selfies, memes, documents, indoor unrelated photos, or blank images.",
        "Department: pothole/pavement → roads; clogged drain/waterlogging/sinkhole → drainage.",
        "Respond with labeled lines:",
        "ImageRelevant: relevant | not_relevant | uncertain",
        "RelevanceScore: 0-100",
        "ImageScene: short phrase",
        "IssueVisible: short phrase",
        "Suggested department: roads|water|drainage|electrical|sanitation|town-planning",
        "ImageNotes: one sentence",
        "",
        `Title: ${input.title}`,
        `Category: ${input.category}`,
        `Ward: ${input.ward ?? "Ahmedabad"}`,
        `Description: ${input.description}`,
        `Photo attached: ${input.imageUrl ? "yes" : "no"}`,
        input.visualSignals
          ? `Visual heuristics: brightness=${input.visualSignals.brightness.toFixed(2)}, variance=${input.visualSignals.variance.toFixed(3)}, asphalt=${input.visualSignals.asphaltScore.toFixed(2)}, water=${input.visualSignals.waterScore.toFixed(2)}, vegetation=${input.visualSignals.vegetationScore.toFixed(2)}, skin=${input.visualSignals.skinScore.toFixed(2)}, edges=${input.visualSignals.edgeEnergy.toFixed(2)}, size=${input.visualSignals.width}x${input.visualSignals.height}, file=${input.visualSignals.fileName ?? "evidence.jpg"}`
          : "Visual heuristics: unavailable",
      ].join("\n"),
    });

    const text = result.answer;
    const relevanceScorePct = Number(
      text.match(/relevancescore[:\-\s]+(\d{1,3})/i)?.[1] ??
        Math.round(local.imageRelevanceScore * 100)
    );

    return {
      imageRelevant: extractRelevance(text, local.imageRelevant),
      imageRelevanceScore: Number(
        clamp01(
          (Math.min(100, Math.max(0, relevanceScorePct)) / 100) * 0.65 +
            local.imageRelevanceScore * 0.35
        ).toFixed(2)
      ),
      imageScene:
        text.match(/imagescene[:\-\s]+(.+)/i)?.[1]?.split("\n")[0]?.trim() ||
        local.imageScene,
      imageIssueHint:
        text.match(/issuevisible[:\-\s]+(.+)/i)?.[1]?.split("\n")[0]?.trim() ||
        local.imageIssueHint,
      imageDepartmentHint: extractDept(text, local.imageDepartmentHint),
      imageNotes:
        text.match(/imagenotes[:\-\s]+(.+)/i)?.[1]?.split("\n")[0]?.trim() ||
        local.imageNotes,
    };
  } catch {
    return local;
  }
}

export function priorityFromImage(
  scan: ImageScanResult,
  fallback: Priority
): Priority {
  if (scan.imageRelevant === "not_relevant") return "low";
  if (scan.imageRelevanceScore >= 0.8 && scan.imageDepartmentHint === "drainage") {
    return fallback === "low" ? "medium" : fallback;
  }
  return fallback;
}
