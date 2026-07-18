import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { exa } from "@/lib/ai/exa";

export const runtime = "nodejs";

const bodySchema = z.object({
  query: z.string().min(3).max(1000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid body", 422);
    }

    const result = await exa.answer({ query: parsed.data.query });
    return ok(result, "Answer generated");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Answer failed";
    if (message.includes("EXA_API_KEY")) {
      return fail("MISSING_EXA_API_KEY", message, 503);
    }
    return fromError(error);
  }
}
