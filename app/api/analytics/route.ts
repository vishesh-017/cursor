import { ok, fromError } from "@/lib/api/response";
import { getManagedWards, scopeReportsForSession } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { getDashboardStats } from "@/services/analytics";
import {
  getDepartments,
  getUrbanPulse,
  getWards,
  listReports,
} from "@/services/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    const managed = getManagedWards(session);
    const reports = scopeReportsForSession(session, listReports());
    const stats = getDashboardStats(reports);
    const wards =
      managed === "all"
        ? getWards()
        : getWards().filter((w) =>
            managed.some((name) => name.toLowerCase() === w.name.toLowerCase())
          );

    return ok(
      {
        stats,
        urbanPulse: getUrbanPulse(),
        departments: getDepartments(),
        wards,
        scope:
          managed === "all"
            ? { type: "city" as const }
            : { type: "ward" as const, wards: managed },
      },
      "Analytics payload"
    );
  } catch (error) {
    return fromError(error);
  }
}
