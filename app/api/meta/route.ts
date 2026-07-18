import { ok, fromError } from "@/lib/api/response";
import {
  getBadges,
  getDepartments,
  getLeaderboard,
  getRewards,
  getWards,
} from "@/services/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(
      {
        wards: getWards(),
        departments: getDepartments(),
        badges: getBadges(),
        rewards: getRewards(),
        leaderboard: getLeaderboard(),
      },
      "Platform meta"
    );
  } catch (error) {
    return fromError(error);
  }
}
