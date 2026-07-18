import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { analyzeInfrastructure } from "@/lib/ai/analyze";
import { research } from "@/lib/ai/exa";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(4),
  description: z.string().min(10),
  category: z.string().min(2),
  ward: z.string().optional(),
  imageUrl: z.string().optional(),
  visualSignals: z
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
    .optional(),
  includeStandards: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    const analysis = await analyzeInfrastructure(parsed.data);

    let standards: {
      answer: string;
      sources: Array<{ title: string; url: string }>;
    } | null = null;

    if (parsed.data.includeStandards !== false && !analysis.standardsNote) {
      try {
        const result = await research({
          topic: `${analysis.damageClass} municipal repair standards India Ahmedabad`,
          numResults: 4,
        });
        standards = {
          answer: result.answer,
          sources: result.sources.map((s) => ({ title: s.title, url: s.url })),
        };
        analysis.standardsNote = result.answer.slice(0, 420);
      } catch {
        // Standards enrichment is optional
      }
    } else if (analysis.standardsNote) {
      standards = { answer: analysis.standardsNote, sources: [] };
    }

    return ok({ analysis, standards }, "Exa AI analysis completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analyze failed";
    if (message.includes("EXA_API_KEY")) {
      return fail("MISSING_EXA_API_KEY", message, 503);
    }
    return fromError(error);
  }
}
