import { answer } from "@/lib/ai/exa";
import type {
  DepartmentId,
  ImageOriginVerdict,
  ImageRelevance,
  Priority,
} from "@/types";

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
  /** Approximate high-frequency noise (camera photos usually higher). */
  noiseScore?: number;
  /** Oversmoothness — elevated on many AI / heavily filtered images. */
  smoothScore?: number;
  saturationMean?: number;
  paletteEntropy?: number;
  fileName?: string;
};

export type ImageScanResult = {
  imageRelevant: ImageRelevance;
  imageRelevanceScore: number;
  imageOrigin: ImageOriginVerdict;
  /** 0–1 confidence that the AI-origin verdict is correct. */
  imageOriginScore: number;
  imageScene: string;
  imageDepartmentHint: DepartmentId;
  imageIssueHint: string;
  imageNotes: string;
  imageWarnings: string[];
};

const departments: DepartmentId[] = [
  "roads",
  "water",
  "drainage",
  "electrical",
  "sanitation",
  "town-planning",
];

const AI_FILENAME =
  /dall[.\-_]?e|midjourney|stable.?diff|stablediffusion|chatgpt|openai|leonardo|flux\.?1|bing.?image|ai[.\-_]?gen|generated|synthetic|dreamstudio|firefly|ideogram|runwayml|sdxl/i;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Instant client/server assessment used before Exa. */
export function assessEvidencePhoto(
  signals: VisualSignals | undefined,
  input?: { title?: string; description?: string; category?: string }
): ImageScanResult {
  return heuristicImageScan(signals, {
    title: input?.title ?? "",
    description: input?.description ?? "",
    category: input?.category ?? "other",
  });
}

export function heuristicImageScan(
  signals: VisualSignals | undefined,
  input: { title: string; description: string; category: string }
): ImageScanResult {
  const text =
    `${input.title} ${input.description} ${input.category} ${signals?.fileName ?? ""}`.toLowerCase();
  const warnings: string[] = [];

  if (!signals) {
    return {
      imageRelevant: "uncertain",
      imageRelevanceScore: 0.45,
      imageOrigin: "uncertain",
      imageOriginScore: 0.4,
      imageScene: "No photo evidence attached",
      imageDepartmentHint: "roads",
      imageIssueHint: "Text-only report — photo recommended",
      imageNotes: "Upload a site photo so AI can verify civic relevance.",
      imageWarnings: ["No photo attached — authenticity is weaker without evidence."],
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
    fileName,
  } = signals;
  const noiseScore = signals.noiseScore ?? Math.min(1, variance * 12);
  const smoothScore =
    signals.smoothScore ?? clamp01(1 - noiseScore + edgeEnergy * 0.2);
  const saturationMean = signals.saturationMean ?? 0.25;
  const paletteEntropy = signals.paletteEntropy ?? 0.5;

  let relevance: ImageRelevance = "relevant";
  let score = 0.55;
  let department: DepartmentId = "roads";
  let scene = "Outdoor civic scene";
  let issue = "Possible infrastructure defect";

  const blank = variance < 0.012 && edgeEnergy < 0.08;
  const selfieLike =
    (skinScore > 0.18 && asphaltScore < 0.16) ||
    (skinScore > 0.24 && asphaltScore < 0.22 && edgeEnergy < 0.22);
  const parkOnly =
    vegetationScore > 0.42 && asphaltScore < 0.1 && waterScore < 0.12;
  const darkUseless = brightness < 0.12 && edgeEnergy < 0.1;
  const documentLike =
    skyScore < 0.05 &&
    asphaltScore < 0.08 &&
    skinScore < 0.08 &&
    vegetationScore < 0.08 &&
    variance < 0.04 &&
    brightness > 0.55;
  const memeLike =
    saturationMean > 0.55 &&
    paletteEntropy < 0.35 &&
    asphaltScore < 0.12 &&
    skinScore < 0.15;

  // --- Unrelated / non-civic ---
  if (blank || darkUseless) {
    relevance = "not_relevant";
    score = 0.18;
    scene = "Blank / unusable image";
    issue = "Photo does not show an infrastructure issue";
    warnings.push("Photo looks blank or too dark to use as evidence.");
  } else if (selfieLike) {
    relevance = "not_relevant";
    score = 0.28;
    scene = "Person / selfie dominant";
    issue = "Image appears unrelated to municipal infrastructure";
    warnings.push("Selfie / person photo — upload the actual road, drain, or lamp.");
  } else if (documentLike) {
    relevance = "not_relevant";
    score = 0.3;
    scene = "Document / screenshot-like";
    issue = "Not a field photo of civic infrastructure";
    warnings.push("Looks like a document or screenshot, not a site photo.");
  } else if (memeLike) {
    relevance = "not_relevant";
    score = 0.32;
    scene = "Graphic / meme-like image";
    issue = "Unrelated decorative or graphic content";
    warnings.push("Image looks graphic/meme-like, not civic evidence.");
  } else if (
    parkOnly &&
    !/pothole|drain|road|leak|light|waste|footpath/.test(text)
  ) {
    relevance = "uncertain";
    score = 0.42;
    scene = "Vegetation-heavy scene";
    issue = "Unclear civic defect in frame";
    warnings.push("Mostly greenery — hard to confirm a municipal defect.");
  } else {
    score = 0.62 + asphaltScore * 0.18 + edgeEnergy * 0.12;
    if (asphaltScore > 0.22 || /pothole|road|pavement|crack/.test(text)) {
      department = "roads";
      scene = "Road / pavement surface";
      issue =
        asphaltScore > 0.25
          ? "Pavement damage / pothole-like surface"
          : "Road corridor issue";
      score += 0.08;
    } else if (
      waterScore > 0.2 ||
      /flood|waterlog|drain|sewage|sinkhole/.test(text)
    ) {
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

    // Category mismatch: roads claim but almost no asphalt/concrete texture
    if (
      (input.category === "roads" || input.category === "footpath") &&
      asphaltScore < 0.08 &&
      edgeEnergy < 0.15
    ) {
      relevance = "uncertain";
      score = Math.min(score, 0.48);
      warnings.push(
        "Category suggests roads/footpath, but photo lacks pavement texture."
      );
    }

    if (score >= 0.55) relevance = "relevant";
    else if (score >= 0.4) relevance = "uncertain";
    else relevance = "not_relevant";
  }

  // --- AI-generated / synthetic suspicion ---
  let origin: ImageOriginVerdict = "likely_photo";
  let originScore = 0.62;
  let aiRisk = 0;

  if (fileName && AI_FILENAME.test(fileName)) {
    aiRisk += 0.55;
    warnings.push(
      `Filename suggests an AI tool (${fileName}) — field photo required.`
    );
  }

  // Sharp structure + very low noise is a common AI / CGI fingerprint
  if (smoothScore > 0.72 && noiseScore < 0.18 && edgeEnergy > 0.12) {
    aiRisk += 0.28;
    warnings.push("Image looks overly smooth for a phone camera (possible AI/CGI).");
  }

  // Hyper-saturated, narrow palette + low noise
  if (saturationMean > 0.48 && paletteEntropy < 0.4 && noiseScore < 0.22) {
    aiRisk += 0.18;
    warnings.push("Color palette looks synthetic / over-processed.");
  }

  // Extremely low variance but non-blank (plastic look)
  if (variance < 0.02 && edgeEnergy > 0.1 && noiseScore < 0.15) {
    aiRisk += 0.15;
  }

  // Square gens + filename stock patterns
  if (
    signals.width === signals.height &&
    signals.width >= 512 &&
    noiseScore < 0.2 &&
    smoothScore > 0.65
  ) {
    aiRisk += 0.1;
  }

  if (/stock|shutterstock|getty|unsplash|pexels|ai art/i.test(fileName ?? "")) {
    aiRisk += 0.2;
    warnings.push("Filename hints at stock / non-field imagery.");
  }

  aiRisk = clamp01(aiRisk);
  if (aiRisk >= 0.55) {
    origin = "possibly_ai_generated";
    originScore = Number((0.55 + aiRisk * 0.4).toFixed(2));
    if (relevance === "relevant") {
      relevance = "uncertain";
      score = Math.min(score, 0.45);
    }
    warnings.push(
      "Treat as possible AI-generated evidence — request a fresh geotagged phone photo."
    );
  } else if (aiRisk >= 0.32) {
    origin = "uncertain";
    originScore = Number((0.45 + aiRisk * 0.35).toFixed(2));
    warnings.push("Photo origin uncertain — could be AI-edited or heavily filtered.");
  } else {
    origin = "likely_photo";
    originScore = Number((0.7 + (1 - aiRisk) * 0.2).toFixed(2));
  }

  // Unrelated + AI together → harder fail
  if (relevance === "not_relevant" && origin === "possibly_ai_generated") {
    score = Math.min(score, 0.2);
  }

  return {
    imageRelevant: relevance,
    imageRelevanceScore: Number(clamp01(score).toFixed(2)),
    imageOrigin: origin,
    imageOriginScore: Number(clamp01(originScore).toFixed(2)),
    imageScene: scene,
    imageDepartmentHint: department,
    imageIssueHint: issue,
    imageNotes: `Visual · asphalt ${Math.round(asphaltScore * 100)}% · skin ${Math.round(skinScore * 100)}% · noise ${Math.round(noiseScore * 100)}% · smooth ${Math.round(smoothScore * 100)}% · AI-risk ${Math.round(aiRisk * 100)}%`,
    imageWarnings: warnings,
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

function extractOrigin(text: string, fallback: ImageOriginVerdict): ImageOriginVerdict {
  const lower = text.toLowerCase();
  if (
    lower.includes("possibly_ai_generated") ||
    lower.includes("ai_generated") ||
    lower.includes("ai-generated") ||
    lower.includes("synthetic") ||
    lower.includes("generated")
  ) {
    return "possibly_ai_generated";
  }
  if (lower.includes("likely_photo") || lower.includes("real photo") || lower.includes("camera")) {
    return "likely_photo";
  }
  if (lower.includes("uncertain")) return "uncertain";
  return fallback;
}

/** Combine pixel heuristics with Exa judgment for relevance + AI-origin. */
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
        "Also judge if the image looks AI-generated / synthetic / stock CGI vs a real phone camera photo.",
        "Mark not_relevant for selfies, memes, documents, indoor unrelated photos, blank images, or stock art.",
        "Mark ImageOrigin possibly_ai_generated when plastic skin/asphalt, impossible lighting, watermark AI tools, or synthetic look.",
        "Department: pothole/pavement → roads; clogged drain/waterlogging/sinkhole → drainage.",
        "Respond with labeled lines:",
        "ImageRelevant: relevant | not_relevant | uncertain",
        "RelevanceScore: 0-100",
        "ImageOrigin: likely_photo | possibly_ai_generated | uncertain",
        "OriginScore: 0-100",
        "ImageScene: short phrase",
        "IssueVisible: short phrase",
        "Suggested department: roads|water|drainage|electrical|sanitation|town-planning",
        "ImageNotes: one sentence",
        "Warnings: short comma-separated risks",
        "",
        `Title: ${input.title}`,
        `Category: ${input.category}`,
        `Ward: ${input.ward ?? "Ahmedabad"}`,
        `Description: ${input.description}`,
        `Photo attached: ${input.imageUrl ? "yes" : "no"}`,
        input.visualSignals
          ? `Visual heuristics: brightness=${input.visualSignals.brightness.toFixed(2)}, variance=${input.visualSignals.variance.toFixed(3)}, asphalt=${input.visualSignals.asphaltScore.toFixed(2)}, water=${input.visualSignals.waterScore.toFixed(2)}, vegetation=${input.visualSignals.vegetationScore.toFixed(2)}, skin=${input.visualSignals.skinScore.toFixed(2)}, edges=${input.visualSignals.edgeEnergy.toFixed(2)}, noise=${(input.visualSignals.noiseScore ?? 0).toFixed(2)}, smooth=${(input.visualSignals.smoothScore ?? 0).toFixed(2)}, sat=${(input.visualSignals.saturationMean ?? 0).toFixed(2)}, entropy=${(input.visualSignals.paletteEntropy ?? 0).toFixed(2)}, size=${input.visualSignals.width}x${input.visualSignals.height}, file=${input.visualSignals.fileName ?? "evidence.jpg"}`
          : "Visual heuristics: unavailable",
        `LocalHeuristicRelevant: ${local.imageRelevant}`,
        `LocalHeuristicOrigin: ${local.imageOrigin}`,
        `LocalWarnings: ${local.imageWarnings.join("; ") || "none"}`,
      ].join("\n"),
    });

    const text = result.answer;
    const relevanceScorePct = Number(
      text.match(/relevancescore[:\-\s]+(\d{1,3})/i)?.[1] ??
        Math.round(local.imageRelevanceScore * 100)
    );
    const originScorePct = Number(
      text.match(/originscore[:\-\s]+(\d{1,3})/i)?.[1] ??
        Math.round(local.imageOriginScore * 100)
    );

    const imageRelevant = extractRelevance(text, local.imageRelevant);
    let imageOrigin = extractOrigin(text, local.imageOrigin);

    // Never downgrade a strong local AI-gen flag from a vague Exa "likely_photo"
    if (
      local.imageOrigin === "possibly_ai_generated" &&
      imageOrigin === "likely_photo"
    ) {
      imageOrigin = "possibly_ai_generated";
    }

    const warnLine =
      text.match(/warnings[:\-\s]+(.+)/i)?.[1]?.split("\n")[0]?.trim() ?? "";
    const exaWarnings = warnLine
      ? warnLine
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean)
      : [];

    const mergedWarnings = Array.from(
      new Set([...local.imageWarnings, ...exaWarnings])
    ).slice(0, 6);

    return {
      imageRelevant,
      imageRelevanceScore: Number(
        clamp01(
          (Math.min(100, Math.max(0, relevanceScorePct)) / 100) * 0.55 +
            local.imageRelevanceScore * 0.45
        ).toFixed(2)
      ),
      imageOrigin,
      imageOriginScore: Number(
        clamp01(
          (Math.min(100, Math.max(0, originScorePct)) / 100) * 0.5 +
            local.imageOriginScore * 0.5
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
      imageWarnings: mergedWarnings,
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
  if (scan.imageOrigin === "possibly_ai_generated") return "low";
  if (scan.imageRelevanceScore >= 0.8 && scan.imageDepartmentHint === "drainage") {
    return fallback === "low" ? "medium" : fallback;
  }
  return fallback;
}
