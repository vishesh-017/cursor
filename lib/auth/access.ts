import type { InfrastructureReport, SessionUser } from "@/types";

/** City HQ sees every ward; ward desks only see assigned ward(s). */
export function isCityAdmin(session: SessionUser | null | undefined): boolean {
  return Boolean(
    session &&
      (session.role === "admin" || session.role === "officer") &&
      session.adminScope === "city"
  );
}

export function getManagedWards(
  session: SessionUser | null | undefined
): string[] | "all" {
  if (!session) return "all";
  if (session.role === "citizen") return "all";
  if (session.adminScope === "city") return "all";
  const wards =
    session.managedWards && session.managedWards.length > 0
      ? session.managedWards
      : session.ward
        ? [session.ward]
        : [];
  return wards.length ? wards : "all";
}

export function canAccessReport(
  session: SessionUser | null | undefined,
  report: InfrastructureReport
): boolean {
  if (!session) return true;
  if (session.role === "citizen") {
    return report.citizenId === session.id;
  }
  const managed = getManagedWards(session);
  if (managed === "all") return true;
  return managed.some(
    (w) => w.toLowerCase() === report.ward.toLowerCase()
  );
}

export function scopeReportsForSession(
  session: SessionUser | null | undefined,
  reports: InfrastructureReport[]
): InfrastructureReport[] {
  if (!session) return reports;
  if (session.role === "citizen") return reports;
  const managed = getManagedWards(session);
  if (managed === "all") return reports;
  const set = new Set(managed.map((w) => w.toLowerCase()));
  return reports.filter((r) => set.has(r.ward.toLowerCase()));
}

export function adminShellTitle(session: SessionUser): string {
  if (session.adminScope === "city") return "AMC City Ops";
  const ward = session.managedWards?.[0] ?? session.ward;
  return `${ward} Ward Ops`;
}
