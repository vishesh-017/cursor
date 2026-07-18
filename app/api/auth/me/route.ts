import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/services/store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return fail("UNAUTHENTICATED", "No active session", 401);
  }
  const profile = getUserById(session.id);
  return ok({ user: session, profile }, "Session active");
}
