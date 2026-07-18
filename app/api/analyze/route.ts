import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { gemini } from "@/lib/ai/gemini";
import { exa } from "@/lib/ai/exa";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(4),
  description: z.string().min(10),
  category: z.string().min(2),
  ward: z.string().optional(),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
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

    const analysis = await gemini.analyzeInfrastructure(parsed.data);

    let standards: { answer: string; sources: Array<{ title: string; url: string }> } | null =
      null;

    if (parsed.data.includeStandards !== false) {
      try {
        const research = await exa.research({
          topic: `${analysis.damageClass} municipal repair standards India Ahmedabad`,
          numResults: 4,
        });
        standards = {
          answer: research.answer,
          sources: research.sources.map((s) => ({ title: s.title, url: s.url })),
        };
        analysis.standardsNote = research.answer.slice(0, 420);
      } catch {
        // Exa optional enrichment
      }
    }

    return ok({ analysis, standards }, "AI analysis completed");
  } catch (error) {
    return fromError(error);
  }
}
