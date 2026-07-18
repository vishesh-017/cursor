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

export async function authenticate(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const cred = demoCredentials.find(
    (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
  );
  if (!cred) return null;
  const user =
    (await getUserById(cred.userId)) ?? (await getUserByEmail(email));
  if (!user) return null;

  const accountStatus = user.accountStatus ?? "active";
  if (accountStatus === "suspended" || accountStatus === "removed") {
    throw new Error(
      accountStatus === "removed"
        ? "This account was removed by AMC for fake or abusive reports."
        : "This account is suspended. Contact your ward desk to appeal."
    );
  }

  const managedWards =
    user.managedWards?.length
      ? user.managedWards
      : user.adminScope === "ward"
        ? [user.ward]
        : user.adminScope === "city"
          ? undefined
          : user.role === "officer"
            ? [user.ward]
            : undefined;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ward: user.ward,
    adminScope:
      user.adminScope ??
      (user.role === "admin" || user.role === "officer" ? "ward" : undefined),
    managedWards,
  };
}
