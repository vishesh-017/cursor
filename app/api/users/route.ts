import { fail, fromError, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getCitizens, listReports } from "@/services/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "officer")) {
      return fail("FORBIDDEN", "Admin or officer access required", 403);
    }

    const [citizens, reports] = await Promise.all([
      getCitizens(),
      listReports(),
    ]);

    const reportCounts = new Map<string, number>();
    const fakeCounts = new Map<string, number>();
    for (const report of reports) {
      reportCounts.set(
        report.citizenId,
        (reportCounts.get(report.citizenId) ?? 0) + 1
      );
      if (report.ai?.authenticity === "possibly_fake") {
        fakeCounts.set(
          report.citizenId,
          (fakeCounts.get(report.citizenId) ?? 0) + 1
        );
      }
    }

    const data = citizens.map((c) => ({
      ...c,
      liveReports: reportCounts.get(c.id) ?? c.reportsCount,
      aiFakeReports: fakeCounts.get(c.id) ?? 0,
    }));

    return ok({ citizens: data }, "Citizens fetched");
  } catch (error) {
    return fromError(error);
  }
}
