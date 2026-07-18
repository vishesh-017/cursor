import { z } from "zod";
import {
  buildChatQuery,
  buildLiveContextSnippet,
  tryLiveDataAnswer,
  tryLocalFaq,
  type ChatMessage,
} from "@/lib/ai/chat";
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

    // 1) Live Urbanexus tickets (my status, worst roads, …)
    const live = await tryLiveDataAnswer({ message, session });
    if (live) {
      return ok(
        {
          answer: live,
          citations: [] as Array<{ title?: string; url?: string }>,
          source: "live" as const,
        },
        "Chat reply ready"
      );
    }

    // 2) In-app FAQ (how to file, demo login, …) — not "my status"
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

    // 3) Exa web answer, grounded with a live data snippet
    const liveContext = await buildLiveContextSnippet(session);
    const query = buildChatQuery({
      message,
      history,
      role: session?.role,
      ward: session?.ward,
      name: session?.name?.split(" ")[0] ?? null,
      liveContext,
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
            answer: [
              session
                ? `Hi ${session.name.split(" ")[0]} — Exa is offline, but I can still use Urbanexus data.`
                : "Exa is offline, but I can still help with Urbanexus basics.",
              "",
              liveContext,
              "",
              'Try asking: "my report status" or "which ward has the worst roads".',
            ].join("\n"),
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
