import { fail, fromError, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getUserById, listReports } from "@/services/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "officer")) {
      return fail("FORBIDDEN", "Admin or officer access required", 403);
    }

    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return fail("NOT_FOUND", "User not found", 404);
    }

    const reports = await listReports({ citizenId: id });
    const aiFakeReports = reports.filter(
      (r) => r.ai?.authenticity === "possibly_fake"
    ).length;

    return ok(
      {
        user: {
          ...user,
          liveReports: reports.length,
          aiFakeReports,
        },
      },
      "User fetched"
    );
  } catch (error) {
    return fromError(error);
  }
}
