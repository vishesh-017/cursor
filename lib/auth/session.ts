import { cookies } from "next/headers";
import { demoCredentials } from "@/data/seed";
import { getUserByEmail, getUserById } from "@/services/store";
import type { SessionUser } from "@/types";

export const SESSION_COOKIE = "urbanexus_session";

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as SessionUser;
    if (!parsed?.id || !parsed?.role || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export function authenticate(email: string, password: string): SessionUser | null {
  const cred = demoCredentials.find(
    (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
  );
  if (!cred) return null;
  const user = getUserById(cred.userId) ?? getUserByEmail(email);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ward: user.ward,
  };
}
