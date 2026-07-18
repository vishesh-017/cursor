import { fail, fromError, ok } from "@/lib/api/response";
import { getEnvStatus } from "@/lib/env";
import { getDbClient, isDatabaseConfigured } from "@/lib/db/config";

export const runtime = "nodejs";

/**
 * GET /api/db/status
 * Shows whether this server uses shared Supabase or local memory.
 */
export async function GET() {
  try {
    const env = getEnvStatus();
    const configured = isDatabaseConfigured();

    if (!configured) {
      return ok(
        {
          mode: "local" as const,
          synced: false,
          configured: false,
          env,
          reportCount: null,
          userCount: null,
          message:
            "Local memory mode — reports stay on this laptop only. Add Supabase keys to sync across devices.",
          setupPath: "/admin/database",
        },
        "Local store active"
      );
    }

    const db = getDbClient();
    if (!db) {
      return fail(
        "DB_CLIENT_ERROR",
        "Supabase keys are present but the client could not be created.",
        503
      );
    }

    const [reports, users] = await Promise.all([
      db.from("reports").select("id", { count: "exact", head: true }),
      db.from("users").select("id", { count: "exact", head: true }),
    ]);

    if (reports.error || users.error) {
      return ok(
        {
          mode: "supabase" as const,
          synced: false,
          configured: true,
          env,
          reportCount: null,
          userCount: null,
          connected: false,
          error: reports.error?.message || users.error?.message,
          message:
            "Supabase keys found, but tables may be missing. Run the SQL migration, then seed demo data.",
          setupPath: "/admin/database",
        },
        "Supabase not ready"
      );
    }

    return ok(
      {
        mode: "supabase" as const,
        synced: true,
        configured: true,
        connected: true,
        env,
        reportCount: reports.count ?? 0,
        userCount: users.count ?? 0,
        message:
          "Shared Supabase database active — any laptop with the same keys sees the same reports.",
        setupPath: "/admin/database",
      },
      "Shared database active"
    );
  } catch (error) {
    return fromError(error);
  }
}
