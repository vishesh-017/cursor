import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { canAccessReport } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { getReportById, listReports, updateReport } from "@/services/store";

export const runtime = "nodejs";

const aiSchema = z.object({
  detection: z.string(),
  damageClass: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string(),
  suggestedDepartment: z.enum([
    "roads",
    "water",
    "drainage",
    "electrical",
    "sanitation",
    "town-planning",
  ]),
  suggestedPriority: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number(),
  authenticity: z.enum(["likely_true", "possibly_fake", "uncertain"]),
  authenticityScore: z.number(),
  priorityScore: z.number(),
  issueDetected: z.string(),
  standardsNote: z.string().optional(),
  imageRelevant: z.enum(["relevant", "not_relevant", "uncertain"]).optional(),
  imageRelevanceScore: z.number().optional(),
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

const patchSchema = z.object({
  status: z
    .enum([
      "submitted",
      "acknowledged",
      "assigned",
      "in_progress",
      "resolved",
      "rejected",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedTo: z.string().optional(),
  departmentId: z
    .enum([
      "roads",
      "water",
      "drainage",
      "electrical",
      "sanitation",
      "town-planning",
    ])
    .optional(),
  timelineNote: z.string().optional(),
  ai: aiSchema.optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    const { id } = await params;
    const report = getReportById(id);
    if (!report) return fail("NOT_FOUND", "Report not found", 404);

    if (
      session &&
      (session.role === "admin" || session.role === "officer") &&
      !canAccessReport(session, report)
    ) {
      return fail(
        "FORBIDDEN",
        `This ticket belongs to ${report.ward} ward — outside your desk`,
        403
      );
    }

    const nearby = listReports()
      .filter((r) => r.id !== id)
      .map((r) => ({
        report: r,
        distanceKm:
          Math.hypot(r.latitude - report.latitude, r.longitude - report.longitude) *
          111,
      }))
      .filter((r) => r.distanceKm < 3)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
      .map((r) => ({ ...r.report, distanceKm: Number(r.distanceKm.toFixed(2)) }));

    return ok({ report, nearby }, "Report details");
  } catch (error) {
    return fromError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "officer")) {
      return fail("FORBIDDEN", "Admin or officer access required", 403);
    }

    const { id } = await params;
    const existing = getReportById(id);
    if (!existing) return fail("NOT_FOUND", "Report not found", 404);
    if (!canAccessReport(session, existing)) {
      return fail(
        "FORBIDDEN",
        `This ticket belongs to ${existing.ward} ward — outside your desk`,
        403
      );
    }

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    const report = updateReport(id, {
      ...parsed.data,
      actor: session.name,
    });

    if (!report) return fail("NOT_FOUND", "Report not found", 404);
    return ok({ report }, "Report updated");
  } catch (error) {
    return fromError(error);
  }
}
