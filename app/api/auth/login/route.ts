import { cookies } from "next/headers";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { authenticate, encodeSession, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return fail("VALIDATION_ERROR", "Valid email and password required", 422);
    }

    let session;
    try {
      session = await authenticate(body.data.email, body.data.password);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err &&
              typeof err === "object" &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Sign-in blocked for this account";
      // DB/schema problems are setup issues, not account bans.
      const setupIssue =
        /could not find the table|schema cache|PGRST205|setup_all|Supabase/i.test(
          message
        );
      return fail(
        setupIssue ? "DB_NOT_READY" : "ACCOUNT_RESTRICTED",
        message,
        setupIssue ? 503 : 403
      );
    }
    if (!session) {
      return fail("INVALID_CREDENTIALS", "Incorrect email or password", 401);
    }

    const jar = await cookies();
    jar.set(SESSION_COOKIE, encodeSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return ok({ user: session }, "Signed in");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return fail("LOGIN_FAILED", message, 500);
  }
}
