import { z } from "zod";

const serverEnvSchema = z.object({
  EXA_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    EXA_API_KEY: process.env.EXA_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    return {};
  }

  return parsed.data;
}

export const env = readEnv();

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export function requireSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to server-only environment variables."
    );
  }
  return key;
}

export function getEnvStatus() {
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return {
    exa: Boolean(process.env.EXA_API_KEY),
    supabaseUrl,
    supabaseAnon,
    supabaseService,
    /** All three Supabase keys present → Postgres store is active. */
    database: supabaseUrl && supabaseAnon && supabaseService,
  };
}
