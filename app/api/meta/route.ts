import { ok, fromError } from "@/lib/api/response";
import {
  getBadges,
  getDepartmentLeaderboard,
  getDepartments,
  getLeaderboard,
  getRewards,
  getWardLeaderboard,
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
        departmentLeaderboard: getDepartmentLeaderboard(),
        wardLeaderboard: getWardLeaderboard(),
      },
      "Platform meta"
    );
  } catch (error) {
    return fromError(error);
  }
}
