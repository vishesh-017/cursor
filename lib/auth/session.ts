import { cookies } from "next/headers";
import { demoCredentials, users as seedUsers } from "@/data/seed";
import {
  getUserByEmail,
  getUserById,
  isDatabaseConfigured,
} from "@/services/store";
import type { SessionUser, UserProfile } from "@/types";

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

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Sign-in failed";
}

function isMissingRelationError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const message = errorMessage(err).toLowerCase();
  return (
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

async function resolveDemoUser(
  email: string,
  userId: string
): Promise<UserProfile | null> {
  try {
    const fromDb =
      (await getUserById(userId)) ?? (await getUserByEmail(email));
    if (fromDb) return fromDb;
  } catch (err) {
    // Keys on, tables missing → use seed profile so demo login still works.
    if (!isMissingRelationError(err) && isDatabaseConfigured()) {
      throw new Error(
        `${errorMessage(err)} — check Supabase keys, run setup_all.sql, then Seed.`
      );
    }
  }

  return (
    seedUsers.find((u) => u.id === userId) ??
    seedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

export async function authenticate(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const cred = demoCredentials.find(
    (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
  );
  if (!cred) return null;

  const user = await resolveDemoUser(email, cred.userId);
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
