import { ok, fromError } from "@/lib/api/response";
import {
  getDepartments,
  getReportStats,
  getUrbanPulse,
  getWards,
} from "@/services/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(
      {
        stats: getReportStats(),
        urbanPulse: getUrbanPulse(),
        departments: getDepartments(),
        wards: getWards(),
      },
      "Analytics payload"
    );
  } catch (error) {
    return fromError(error);
  }
}
