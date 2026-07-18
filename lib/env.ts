import { z } from "zod";

const serverEnvSchema = z.object({
  EXA_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    EXA_API_KEY: process.env.EXA_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  if (!parsed.success) {
    return {};
  }

  return parsed.data;
}

export const env = readEnv();

/** Project URL — supports NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL. */
export function getSupabaseUrl(): string | undefined {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  return url?.trim() || undefined;
}

/** Publishable (`sb_publishable_…`) or legacy anon JWT. */
export function getSupabaseAnonKey(): string | undefined {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return key?.trim() || undefined;
}

/** Secret (`sb_secret_…`) or legacy service_role JWT — server only. */
export function getSupabaseServiceKey(): string | undefined {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return key?.trim() || undefined;
}

export function requireExaApiKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    throw new Error(
      "EXA_API_KEY is missing. Add it to .env.local or Vercel environment variables."
    );
  }
  return key;
}

export function getSupabasePublicConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export function requireSupabaseServiceRoleKey(): string {
  const key = getSupabaseServiceKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing. Add the sb_secret_… or service_role key from Supabase → API Keys."
    );
  }
  return key;
}

export function getEnvStatus() {
  const supabaseUrl = Boolean(getSupabaseUrl());
  const supabaseAnon = Boolean(getSupabaseAnonKey());
  const supabaseService = Boolean(getSupabaseServiceKey());
  return {
    exa: Boolean(process.env.EXA_API_KEY),
    supabaseUrl,
    supabaseAnon,
    supabaseService,
    /** All three Supabase keys present → Postgres store is active. */
    database: supabaseUrl && supabaseAnon && supabaseService,
  };
}
