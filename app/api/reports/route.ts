import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { createReport, getDashboardStats, listReports } from "@/services/reports";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(4).max(140),
  description: z.string().min(10).max(2000),
  category: z.enum(["roads", "water", "drainage", "lighting", "waste", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  ward: z.string().min(2).max(80),
  latitude: z.number().min(22).max(24),
  longitude: z.number().min(72).max(73.5),
  imageUrl: z.string().url().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "1";
    const reports = listReports();

    return ok(
      {
        reports,
        stats: includeStats ? getDashboardStats(reports) : undefined,
      },
      "Reports fetched"
    );
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json);

    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid body", 422);
    }

    const report = createReport(parsed.data);
    return ok({ report }, "Report created", 201);
  } catch (error) {
    return fromError(error);
  }
}
