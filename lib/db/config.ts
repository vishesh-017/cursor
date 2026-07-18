import { getEnvStatus } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** True when URL + publishable/anon + secret/service_role are present. */
export function isDatabaseConfigured(): boolean {
  return getEnvStatus().database;
}

export function getDbClient(): SupabaseClient | null {
  if (!isDatabaseConfigured()) return null;
  try {
    return createServiceSupabaseClient();
  } catch {
    return null;
  }
}
