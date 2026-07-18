import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getReportById, moderateUser, updateReport } from "@/services/store";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["flag", "suspend", "remove", "reinstate"]),
  reason: z.string().min(4).max(500),
  reportId: z.string().optional(),
  /** When flagging from a ticket, also reject that report as fake. */
  rejectReport: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "officer")) {
      return fail("FORBIDDEN", "Admin or officer access required", 403);
    }

    const { id: userId } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    if (parsed.data.reportId) {
      const report = await getReportById(parsed.data.reportId);
      if (!report) {
        return fail("NOT_FOUND", "Linked report not found", 404);
      }
      if (report.citizenId !== userId) {
        return fail(
          "VALIDATION_ERROR",
          "Report does not belong to this citizen",
          422
        );
      }
    }

    const user = await moderateUser({
      userId,
      action: parsed.data.action,
      reason: parsed.data.reason,
      reportId: parsed.data.reportId,
      actorId: session.id,
      actorName: session.name,
    });

    if (!user) {
      return fail(
        "NOT_FOUND",
        "Citizen not found or cannot be moderated",
        404
      );
    }

    let rejectedReport = null;
    if (
      parsed.data.rejectReport &&
      parsed.data.reportId &&
      (parsed.data.action === "flag" ||
        parsed.data.action === "suspend" ||
        parsed.data.action === "remove")
    ) {
      rejectedReport = await updateReport(parsed.data.reportId, {
        status: "rejected",
        timelineNote: `Rejected as fake / spam — citizen ${parsed.data.action}: ${parsed.data.reason}`,
        actor: session.name,
      });
    }

    return ok(
      { user, report: rejectedReport },
      `Citizen ${parsed.data.action} applied`
    );
  } catch (error) {
    return fromError(error);
  }
}
