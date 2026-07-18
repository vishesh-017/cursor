import { ok } from "@/lib/api/response";
import { getEnvStatus } from "@/lib/env";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";

export async function GET() {
  return ok(
    {
      service: siteConfig.name,
      status: "healthy",
      timestamp: new Date().toISOString(),
      env: getEnvStatus(),
    },
    "Urbanexus API is healthy"
  );
}
