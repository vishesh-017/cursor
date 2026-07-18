import {
  badges,
  departments,
  leaderboard,
  notifications,
  rewards,
  seedReports,
  users,
  wards,
} from "@/data/seed";
import { getDbClient, isDatabaseConfigured } from "@/lib/db/config";
import { reportToRow, userToRow } from "@/lib/db/mappers";

export type SeedResult = {
  configured: boolean;
  seeded: boolean;
  counts: Record<string, number>;
  message: string;
};

/** Upsert demo seed into Supabase. Safe to re-run (upsert by primary key). */
export async function seedDatabase(options?: {
  force?: boolean;
}): Promise<SeedResult> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      seeded: false,
      counts: {},
      message:
        "Supabase env missing. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const db = getDbClient();
  if (!db) {
    return {
      configured: false,
      seeded: false,
      counts: {},
      message: "Could not create Supabase service client.",
    };
  }

  if (!options?.force) {
    const { count } = await db
      .from("users")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return {
        configured: true,
        seeded: false,
        counts: { users: count ?? 0 },
        message: "Database already has users. Pass force=true to re-seed.",
      };
    }
  }

  const { error: usersErr } = await db
    .from("users")
    .upsert(users.map(userToRow), { onConflict: "id" });
  if (usersErr) throw usersErr;

  const { error: wardsErr } = await db.from("wards").upsert(
    wards.map((w) => ({
      id: w.id,
      name: w.name,
      zone: w.zone,
      population: w.population,
      center: w.center,
      boundary: w.boundary,
      health_score: w.healthScore,
      open_issues: w.openIssues,
    })),
    { onConflict: "id" }
  );
  if (wardsErr) throw wardsErr;

  const { error: deptErr } = await db.from("departments").upsert(
    departments.map((d) => ({
      id: d.id,
      name: d.name,
      head: d.head,
      open_issues: d.openIssues,
      resolved_issues: d.resolvedIssues,
      avg_resolution_hours: d.avgResolutionHours,
      efficiency: d.efficiency,
    })),
    { onConflict: "id" }
  );
  if (deptErr) throw deptErr;

  const { error: badgeErr } = await db.from("badges").upsert(
    badges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      points_required: b.pointsRequired,
    })),
    { onConflict: "id" }
  );
  if (badgeErr) throw badgeErr;

  const { error: rewardErr } = await db.from("rewards").upsert(
    rewards.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      points_cost: r.pointsCost,
      available: r.available,
    })),
    { onConflict: "id" }
  );
  if (rewardErr) throw rewardErr;

  const { error: lbErr } = await db.from("leaderboard_entries").upsert(
    leaderboard.map((e) => ({
      user_id: e.userId,
      rank: e.rank,
      name: e.name,
      ward: e.ward,
      points: e.points,
      reports: e.reports,
      badges: e.badges,
    })),
    { onConflict: "user_id" }
  );
  if (lbErr) throw lbErr;

  // Strip huge base64 images from seed if present — keep URLs short for DB seed.
  const reportRows = seedReports.map((r) => {
    const row = reportToRow(r);
    if (row.image_url && row.image_url.startsWith("data:")) {
      row.image_url = null;
      row.image_urls = [];
    }
    return row;
  });
  const { error: reportErr } = await db
    .from("reports")
    .upsert(reportRows, { onConflict: "id" });
  if (reportErr) throw reportErr;

  const { error: notifErr } = await db.from("notifications").upsert(
    notifications.map((n) => ({
      id: n.id,
      user_id: n.userId,
      title: n.title,
      body: n.body,
      created_at: n.createdAt,
      read: n.read,
      href: n.href,
    })),
    { onConflict: "id" }
  );
  if (notifErr) throw notifErr;

  return {
    configured: true,
    seeded: true,
    counts: {
      users: users.length,
      wards: wards.length,
      departments: departments.length,
      reports: seedReports.length,
      notifications: notifications.length,
    },
    message: "Seeded Urbanexus demo data into Supabase.",
  };
}
