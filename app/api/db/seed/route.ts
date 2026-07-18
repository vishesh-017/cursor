import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";
import { isDatabaseConfigured } from "@/lib/db/config";
import { seedDatabase } from "@/services/seed-database";

export const runtime = "nodejs";

const bodySchema = z.object({
  force: z.boolean().optional(),
});

/**
 * POST /api/db/seed
 * Loads demo users/wards/reports into Supabase.
 * Locally: no secret required.
 * On Vercel: set DB_SEED_SECRET and send header x-seed-secret.
 */
export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return fail(
        "DB_NOT_CONFIGURED",
        "Add Supabase URL, anon key, and service role key to env.",
        503
      );
    }

    const seedSecret = process.env.DB_SEED_SECRET;
    if (seedSecret) {
      const header = request.headers.get("x-seed-secret");
      if (header !== seedSecret) {
        return fail("FORBIDDEN", "Invalid seed secret", 403);
      }
    }

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    const force = parsed.success ? Boolean(parsed.data.force) : false;

    const result = await seedDatabase({ force });
    return ok(result, result.message);
  } catch (error) {
    return fromError(error);
  }
}

export async function GET() {
  return ok(
    {
      configured: isDatabaseConfigured(),
      hint: "POST /api/db/seed to load demo data after running supabase/migrations/001_urbanexus.sql",
    },
    "DB seed status"
  );
}
