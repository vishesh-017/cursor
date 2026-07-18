import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { buildFraudOpsSummary } from "@/lib/ai/fraud-insights";
import {
  buildDepartmentPulse,
  buildOpsInsight,
  findIssuePatterns,
} from "@/lib/ai/ops-insights";
import { analyzeInfrastructure } from "@/lib/ai/analyze";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [departments, patterns, fraud] = await Promise.all([
      buildDepartmentPulse(),
      findIssuePatterns(6),
      buildFraudOpsSummary(30),
    ]);
    return ok(
      {
        departments,
        patterns,
        fraud,
      },
      "AI ops pulse"
    );
  } catch (error) {
    return fromError(error);
  }
}

const predictSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(10),
  category: z.string().min(2),
  ward: z.string().optional(),
  runExa: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = predictSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    let analysis = null;
    if (parsed.data.runExa !== false) {
      try {
        analysis = await analyzeInfrastructure({
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          ward: parsed.data.ward,
        });
      } catch {
        analysis = null;
      }
    }

    const ops = await buildOpsInsight({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      ward: parsed.data.ward,
      departmentId: analysis?.suggestedDepartment,
      priority: analysis?.suggestedPriority,
    });

    const [departments, patterns, fraud] = await Promise.all([
      buildDepartmentPulse(),
      findIssuePatterns(5),
      buildFraudOpsSummary(30),
    ]);

    return ok(
      {
        analysis,
        ops,
        departments,
        patterns,
        fraud,
      },
      "AI operational prediction ready"
    );
  } catch (error) {
    return fromError(error);
  }
}
