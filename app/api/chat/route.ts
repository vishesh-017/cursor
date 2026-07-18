import { z } from "zod";
import {
  buildChatQuery,
  buildLiveContextSnippet,
  buildOfflineHelperAnswer,
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
  message: z.string().min(1).max(1500),
  history: z.array(messageSchema).max(16).optional(),
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

    // 1) Live Urbanexus tickets (status, wards, categories, critical, ids, …)
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

    // 2) In-app FAQ (how to file, demo login, greetings, …)
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

    // 3) Exa web answer, grounded with a rich live data snippet
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
      const answer = (result.answer || "").trim();
      if (!answer) {
        const fallback = await buildOfflineHelperAnswer({
          message,
          session,
          liveContext,
        });
        return ok(
          {
            answer: fallback,
            citations: [],
            source: "fallback" as const,
          },
          "Helper reply ready"
        );
      }
      return ok(
        {
          answer,
          citations: result.citations.slice(0, 4).map((c) => ({
            title: c.title,
            url: c.url,
          })),
          source: "exa" as const,
        },
        "Chat reply ready"
      );
    } catch {
      const fallback = await buildOfflineHelperAnswer({
        message,
        session,
        liveContext,
      });
      return ok(
        {
          answer: fallback,
          citations: [],
          source: "fallback" as const,
        },
        "Offline helper reply"
      );
    }
  } catch (error) {
    return fromError(error);
  }
}
