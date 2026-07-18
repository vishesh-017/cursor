import { ok, fromError } from "@/lib/api/response";
import {
  getPointsCriteriaRows,
  POINTS_POLICY,
  pointsPolicyBlurb,
} from "@/lib/points/criteria";
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
    const [
      wards,
      departments,
      badges,
      rewards,
      leaderboard,
      departmentLeaderboard,
      wardLeaderboard,
    ] = await Promise.all([
      getWards(),
      getDepartments(),
      getBadges(),
      getRewards(),
      getLeaderboard(),
      getDepartmentLeaderboard(),
      getWardLeaderboard(),
    ]);

    return ok(
      {
        wards,
        departments,
        badges,
        rewards,
        leaderboard,
        departmentLeaderboard,
        wardLeaderboard,
        pointsCriteria: {
          policy: POINTS_POLICY,
          rows: getPointsCriteriaRows(),
          blurb: pointsPolicyBlurb(),
        },
      },
      "Platform meta"
    );
  } catch (error) {
    return fromError(error);
  }
}
