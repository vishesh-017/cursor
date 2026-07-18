import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** True when all three Supabase env vars are present. */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getDbClient(): SupabaseClient | null {
  if (!isDatabaseConfigured()) return null;
  try {
    return createServiceSupabaseClient();
  } catch {
    return null;
  }
}
