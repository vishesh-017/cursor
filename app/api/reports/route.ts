import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import {
  getManagedWards,
  scopeReportsForSession,
} from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { analyzeInfrastructure } from "@/lib/ai/analyze";
import {
  createReport,
  getReportStats,
  listReports,
} from "@/services/store";
import type { AiAnalysis } from "@/types";

export const runtime = "nodejs";

const imageRef = z
  .string()
  .min(12)
  .refine(
    (v) => v.startsWith("data:image/") || /^https?:\/\//i.test(v),
    "imageUrl must be a data URL or http(s) URL"
  );

const visualSignalsSchema = z
  .object({
    width: z.number(),
    height: z.number(),
    brightness: z.number(),
    variance: z.number(),
    asphaltScore: z.number(),
    vegetationScore: z.number(),
    waterScore: z.number(),
    skinScore: z.number(),
    skyScore: z.number(),
    edgeEnergy: z.number(),
    fileName: z.string().optional(),
  })
  .optional();

const aiSchema = z.object({
  detection: z.string().min(2),
  damageClass: z.string().min(2),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().min(4),
  suggestedDepartment: z.enum([
    "roads",
    "water",
    "drainage",
    "electrical",
    "sanitation",
    "town-planning",
  ]),
  suggestedPriority: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  authenticity: z.enum(["likely_true", "possibly_fake", "uncertain"]),
  authenticityScore: z.number().min(0).max(1),
  priorityScore: z.number().min(0).max(100),
  issueDetected: z.string().min(2),
  standardsNote: z.string().optional(),
  imageRelevant: z.enum(["relevant", "not_relevant", "uncertain"]).optional(),
  imageRelevanceScore: z.number().min(0).max(1).optional(),
  imageScene: z.string().optional(),
  imageDepartmentHint: z
    .enum([
      "roads",
      "water",
      "drainage",
      "electrical",
      "sanitation",
      "town-planning",
    ])
    .optional(),
  imageIssueHint: z.string().optional(),
  imageNotes: z.string().optional(),
});

const createSchema = z.object({
  title: z.string().min(4).max(160),
  description: z.string().min(10).max(3000),
  category: z.enum([
    "roads",
    "water",
    "drainage",
    "lighting",
    "waste",
    "footpath",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  ward: z.string().min(2).max(80),
  wardId: z.string().optional(),
  address: z.string().min(4).max(240),
  latitude: z.number().min(22).max(24),
  longitude: z.number().min(72).max(73.5),
  imageUrl: imageRef.optional(),
  imageUrls: z.array(imageRef).max(6).optional(),
  visualSignals: visualSignalsSchema,
  runAi: z.boolean().optional(),
  ai: aiSchema.optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const managed = getManagedWards(session);
    const requestedWard = searchParams.get("ward") ?? undefined;

    // Ward desks cannot query other wards; city HQ and public map keep full access.
    let ward = requestedWard;
    let wards: string[] | undefined;
    if (
      session &&
      (session.role === "admin" || session.role === "officer") &&
      managed !== "all"
    ) {
      wards = managed;
      if (
        requestedWard &&
        !managed.some((w) => w.toLowerCase() === requestedWard.toLowerCase())
      ) {
        return fail(
          "FORBIDDEN",
          `This desk only receives ${managed.join(", ")} ward tickets`,
          403
        );
      }
      ward = requestedWard;
    }

    const reports = scopeReportsForSession(
      session,
      listReports({
        citizenId: searchParams.get("citizenId") ?? undefined,
        status: (searchParams.get("status") as never) ?? undefined,
        ward,
        wards: ward ? undefined : wards,
        priority: searchParams.get("priority") ?? undefined,
        departmentId: searchParams.get("departmentId") ?? undefined,
        q: searchParams.get("q") ?? undefined,
      })
    );

    const stats =
      searchParams.get("stats") === "1"
        ? getReportStats(
            managed === "all"
              ? { ward: requestedWard ?? undefined }
              : { wards: managed }
          )
        : undefined;

    return ok(
      {
        reports,
        stats,
        scope:
          managed === "all"
            ? { type: "city" as const }
            : { type: "ward" as const, wards: managed },
      },
      "Reports fetched"
    );
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const json = await request.json();
    const parsed = createSchema.safeParse(json);

    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    // AI triage runs server-side for the AMC admin desk — never required for create.
    let analysis: AiAnalysis | undefined =
      parsed.data.runAi === false ? parsed.data.ai : undefined;

    const imageUrls = parsed.data.imageUrls?.length
      ? parsed.data.imageUrls
      : parsed.data.imageUrl
        ? [parsed.data.imageUrl]
        : undefined;
    const imageUrl = imageUrls?.[0];

    if (parsed.data.runAi !== false && !analysis) {
      try {
        analysis = await analyzeInfrastructure({
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          ward: parsed.data.ward,
          imageUrl,
          visualSignals: parsed.data.visualSignals,
        });
      } catch {
        analysis = undefined;
      }
    }

    const report = createReport({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priority:
        parsed.data.priority ?? analysis?.suggestedPriority ?? "medium",
      ward: parsed.data.ward,
      wardId: parsed.data.wardId ?? `w-${parsed.data.ward.toLowerCase()}`,
      address: parsed.data.address,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      citizenId: session?.id ?? "user-citizen-1",
      citizenName: session?.name ?? "Ahmedabad Citizen",
      departmentId: analysis?.suggestedDepartment ?? "roads",
      imageUrl,
      imageUrls,
      ai: analysis,
    });

    return ok({ report }, "Report created", 201);
  } catch (error) {
    return fromError(error);
  }
}
