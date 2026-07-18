import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(config.url, config.anonKey);
  }

  return browserClient;
}
