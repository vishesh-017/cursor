import { z } from "zod";
import { buildChatQuery, tryLocalFaq, type ChatMessage } from "@/lib/ai/chat";
import { exa } from "@/lib/ai/exa";
import { fail, fromError, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(messageSchema).max(12).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid body",
        422
      );
    }

    const session = await getSession();
    const message = parsed.data.message.trim();
    const history = (parsed.data.history ?? []) as ChatMessage[];

    const local = tryLocalFaq(message);
    if (local) {
      return ok(
        {
          answer: local,
          citations: [] as Array<{ title?: string; url?: string }>,
          source: "local" as const,
        },
        "Chat reply ready"
      );
    }

    const query = buildChatQuery({
      message,
      history,
      role: session?.role,
      ward: session?.ward,
    });

    try {
      const result = await exa.answer({ query });
      return ok(
        {
          answer: result.answer,
          citations: result.citations.slice(0, 4).map((c) => ({
            title: c.title,
            url: c.url,
          })),
          source: "exa" as const,
        },
        "Chat reply ready"
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Chat failed";
      if (msg.includes("EXA_API_KEY")) {
        return ok(
          {
            answer:
              "I can still help with Urbanexus basics offline. Ask how to file a report, demo login, ticket statuses, City Map, or AI Lab — or add EXA_API_KEY for full civic Q&A.",
            citations: [],
            source: "fallback" as const,
          },
          "Offline helper reply"
        );
      }
      throw error;
    }
  } catch (error) {
    return fromError(error);
  }
}
