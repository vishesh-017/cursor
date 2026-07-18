import { cookies } from "next/headers";
import { ok } from "@/lib/api/response";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return ok({ signedOut: true }, "Signed out");
}
