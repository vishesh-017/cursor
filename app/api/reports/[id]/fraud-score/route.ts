import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import {
  applyFraudScoreReduction,
  computeFraudScore,
  toFraudRow,
} from "@/lib/ai/fraud-insights";
import { getSession } from "@/lib/auth/session";
import { getReportById, updateReport } from "@/services/store";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** Points to subtract from the fraud score (5–40). */
  reduceBy: z.number().min(5).max(40).default(15),
  note: z.string().max(300).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "officer")) {
      return fail("FORBIDDEN", "Admin or officer access required", 403);
    }

    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    const report = await getReportById(id);
    if (!report) return fail("NOT_FOUND", "Report not found", 404);
    if (!report.ai) {
      return fail(
        "VALIDATION_ERROR",
        "Run Exa AI triage before adjusting fraud score",
        422
      );
    }

    const before = computeFraudScore(report.ai);
    const nextAi = applyFraudScoreReduction(report.ai, parsed.data.reduceBy);
    const after = computeFraudScore(nextAi);

    const note =
      parsed.data.note?.trim() ||
      `Officer reduced fraud score ${before} → ${after} (−${before - after})`;

    const updated = await updateReport(id, {
      ai: nextAi,
      timelineNote: note,
      actor: session.name,
    });

    if (!updated) {
      return fail("UPDATE_FAILED", "Could not update fraud score", 500);
    }

    return ok(
      {
        report: updated,
        fraud: toFraudRow(updated),
        before,
        after,
      },
      `Fraud score reduced to ${after}`
    );
  } catch (error) {
    return fromError(error);
  }
}
