import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  requireSupabaseServiceRoleKey,
} from "@/lib/env";

export function createServerSupabaseClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Server-only. Never import this into Client Components. */
export function createServiceSupabaseClient(): SupabaseClient {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for the service client."
    );
  }

  const serviceRoleKey = requireSupabaseServiceRoleKey();

  return createClient(config.url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
