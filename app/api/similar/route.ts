import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { exa } from "@/lib/ai/exa";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url(),
  numResults: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid body", 422);
    }

    const results = await exa.findSimilar({
      url: parsed.data.url,
      numResults: parsed.data.numResults,
    });

    return ok({ results }, "Similar sources found");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Find similar failed";
    if (message.includes("EXA_API_KEY")) {
      return fail("MISSING_EXA_API_KEY", message, 503);
    }
    return fromError(error);
  }
}
