import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { analyzeInfrastructure } from "@/lib/ai/analyze";
import {
  createReport,
  getReportStats,
  listReports,
} from "@/services/store";

export const runtime = "nodejs";

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
  imageUrl: z.string().url().optional(),
  runAi: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reports = listReports({
      citizenId: searchParams.get("citizenId") ?? undefined,
      status: (searchParams.get("status") as never) ?? undefined,
      ward: searchParams.get("ward") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    return ok(
      {
        reports,
        stats: searchParams.get("stats") === "1" ? getReportStats() : undefined,
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

    const analysis =
      parsed.data.runAi === false
        ? undefined
        : await analyzeInfrastructure({
            title: parsed.data.title,
            description: parsed.data.description,
            category: parsed.data.category,
            ward: parsed.data.ward,
          });

    const report = createReport({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority ?? analysis?.suggestedPriority ?? "medium",
      ward: parsed.data.ward,
      wardId: parsed.data.wardId ?? `w-${parsed.data.ward.toLowerCase()}`,
      address: parsed.data.address,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      citizenId: session?.id ?? "user-citizen-1",
      citizenName: session?.name ?? "Ahmedabad Citizen",
      departmentId: analysis?.suggestedDepartment ?? "roads",
      imageUrl: parsed.data.imageUrl,
      ai: analysis,
    });

    return ok({ report }, "Report created", 201);
  } catch (error) {
    return fromError(error);
  }
}
