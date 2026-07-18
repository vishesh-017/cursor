/**
 * Lean cloud seed — looks like a few real citizen filings, not a bulk dump.
 * Used by POST /api/db/seed (Supabase). Local memory still uses full data/seed.ts.
 */
import type {
  InfrastructureReport,
  LeaderboardEntry,
  NotificationItem,
  TimelineEvent,
  UserProfile,
} from "@/types";
import { badges, departments, rewards, wards } from "@/data/seed";

function tl(
  id: string,
  at: string,
  title: string,
  description: string,
  actor: string,
  status?: TimelineEvent["status"]
): TimelineEvent {
  return { id, at, title, description, actor, status };
}

/** Demo logins that must exist in cloud DB. */
export const cloudDemoUsers: UserProfile[] = [
  {
    id: "user-citizen-1",
    name: "Aarav Sharma",
    email: "aarav.sharma@gmail.com",
    phone: "+91 98765 43210",
    role: "citizen",
    ward: "Vastrapur",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    points: 180,
    badges: ["badge-first"],
    joinedAt: "2026-06-02T10:00:00.000Z",
    reportsCount: 2,
    resolvedCount: 0,
    accountStatus: "active",
  },
  {
    id: "user-citizen-2",
    name: "Priya Mehta",
    email: "priya.mehta@yahoo.com",
    phone: "+91 98250 11882",
    role: "citizen",
    ward: "Maninagar",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    points: 170,
    badges: ["badge-first"],
    joinedAt: "2026-05-18T08:30:00.000Z",
    reportsCount: 2,
    resolvedCount: 0,
    accountStatus: "active",
  },
  {
    id: "user-citizen-3",
    name: "Harsh Patel",
    email: "harsh.patel@outlook.com",
    phone: "+91 99099 22110",
    role: "citizen",
    ward: "Thaltej",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    points: 90,
    badges: ["badge-first"],
    joinedAt: "2026-06-20T12:00:00.000Z",
    reportsCount: 1,
    resolvedCount: 0,
    accountStatus: "active",
  },
  {
    id: "user-admin-1",
    name: "Rajesh Chauhan",
    email: "admin@amc.gov.in",
    phone: "+91 79 2539 1811",
    role: "admin",
    ward: "Ellisbridge",
    adminScope: "city",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    points: 0,
    badges: [],
    joinedAt: "2024-04-01T06:00:00.000Z",
    reportsCount: 0,
    resolvedCount: 0,
    accountStatus: "active",
  },
  {
    id: "user-ward-admin-w-maninagar",
    name: "Maninagar Ward Desk",
    email: "maninagar.admin@amc.gov.in",
    phone: "+91 79 2539 1803",
    role: "admin",
    ward: "Maninagar",
    adminScope: "ward",
    managedWards: ["Maninagar"],
    avatarUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop",
    points: 0,
    badges: [],
    joinedAt: "2025-01-10T07:00:00.000Z",
    reportsCount: 0,
    resolvedCount: 0,
    accountStatus: "active",
  },
];

/** Five tickets — mixed wards, priorities, and stages (feels hand-filed). */
export const cloudDemoReports: InfrastructureReport[] = [
  {
    id: "rpt-1002",
    title: "Waterlogging at Maninagar underpass",
    description:
      "Standing water after overnight rain. Drain grate near the east approach looks clogged.",
    category: "drainage",
    status: "assigned",
    priority: "critical",
    ward: "Maninagar",
    wardId: "w-maninagar",
    address: "Maninagar railway underpass, east approach",
    latitude: 22.9972,
    longitude: 72.6025,
    createdAt: "2026-07-15T14:05:00.000Z",
    updatedAt: "2026-07-16T08:40:00.000Z",
    citizenId: "user-citizen-2",
    citizenName: "Priya Mehta",
    assignedTo: "Er. Ravi Trivedi",
    departmentId: "drainage",
    imageUrl:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&h=600&fit=crop",
    ai: {
      detection: "Storm-water blockage at underpass",
      damageClass: "Drainage obstruction",
      severity: "critical",
      summary: "Critical flooding risk — desilt and clear grate before next shower.",
      suggestedDepartment: "drainage",
      suggestedPriority: "critical",
      confidence: 0.93,
      authenticity: "likely_true",
      authenticityScore: 0.9,
      priorityScore: 92,
      issueDetected: "Underpass waterlogging",
      imageRelevant: "relevant",
      imageRelevanceScore: 0.86,
      imageOrigin: "likely_photo",
      imageOriginScore: 0.8,
    },
    timeline: [
      tl(
        "t1",
        "2026-07-15T14:05:00.000Z",
        "Report submitted",
        "Citizen filed critical flooding report.",
        "Priya Mehta",
        "submitted"
      ),
      tl(
        "t2",
        "2026-07-15T14:40:00.000Z",
        "Acknowledged",
        "Drainage desk raised priority to critical.",
        "AMC Ops",
        "acknowledged"
      ),
      tl(
        "t3",
        "2026-07-16T08:40:00.000Z",
        "Crew assigned",
        "Jetting unit assigned to Maninagar underpass.",
        "Er. Ravi Trivedi",
        "assigned"
      ),
    ],
    pointsAwarded: 120,
  },
  {
    id: "rpt-1001",
    title: "Deep pothole on SG Highway near ISKCON",
    description:
      "Large pothole on the service road. Two-wheelers are swerving into traffic.",
    category: "roads",
    status: "in_progress",
    priority: "high",
    ward: "Thaltej",
    wardId: "w-thaltej",
    address: "SG Highway service road, near ISKCON, Thaltej",
    latitude: 23.0495,
    longitude: 72.5078,
    createdAt: "2026-07-16T08:20:00.000Z",
    updatedAt: "2026-07-17T11:00:00.000Z",
    citizenId: "user-citizen-3",
    citizenName: "Harsh Patel",
    assignedTo: "Er. Ketan Patel",
    departmentId: "roads",
    imageUrl:
      "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&h=600&fit=crop",
    ai: {
      detection: "Asphalt pothole on service road",
      damageClass: "Pavement distress",
      severity: "high",
      summary: "High-traffic patch needed before monsoon worsens the crater.",
      suggestedDepartment: "roads",
      suggestedPriority: "high",
      confidence: 0.9,
      authenticity: "likely_true",
      authenticityScore: 0.88,
      priorityScore: 78,
      issueDetected: "Deep pothole",
      imageRelevant: "relevant",
      imageRelevanceScore: 0.9,
      imageOrigin: "likely_photo",
      imageOriginScore: 0.85,
    },
    timeline: [
      tl(
        "t1",
        "2026-07-16T08:20:00.000Z",
        "Report submitted",
        "Citizen report received.",
        "Harsh Patel",
        "submitted"
      ),
      tl(
        "t2",
        "2026-07-16T09:05:00.000Z",
        "Acknowledged",
        "Roads desk acknowledged.",
        "AMC Ops",
        "acknowledged"
      ),
      tl(
        "t3",
        "2026-07-16T14:30:00.000Z",
        "Assigned",
        "Crew R-12 assigned for patching.",
        "Er. Ketan Patel",
        "assigned"
      ),
      tl(
        "t4",
        "2026-07-17T11:00:00.000Z",
        "In progress",
        "Cold mix started on site.",
        "Field Crew R-12",
        "in_progress"
      ),
    ],
    pointsAwarded: 80,
  },
  {
    id: "rpt-1005",
    title: "Low water pressure in Vastrapur Sector 5",
    description:
      "Morning supply is too weak for upper floors between 6–9 AM near Himalaya Mall.",
    category: "water",
    status: "in_progress",
    priority: "high",
    ward: "Vastrapur",
    wardId: "w-vastrapur",
    address: "Vastrapur Sector 5, near Himalaya Mall approach",
    latitude: 23.0387,
    longitude: 72.5289,
    createdAt: "2026-07-14T06:50:00.000Z",
    updatedAt: "2026-07-16T09:10:00.000Z",
    citizenId: "user-citizen-1",
    citizenName: "Aarav Sharma",
    assignedTo: "Er. Meera Shah",
    departmentId: "water",
    imageUrl:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&h=600&fit=crop",
    ai: {
      detection: "Distribution pressure shortfall",
      damageClass: "Water supply",
      severity: "high",
      summary: "Peak-hour pressure drop — check feeder valve / possible leak.",
      suggestedDepartment: "water",
      suggestedPriority: "high",
      confidence: 0.86,
      authenticity: "likely_true",
      authenticityScore: 0.87,
      priorityScore: 72,
      issueDetected: "Low water pressure",
      imageRelevant: "relevant",
      imageRelevanceScore: 0.7,
      imageOrigin: "likely_photo",
      imageOriginScore: 0.75,
    },
    timeline: [
      tl(
        "t1",
        "2026-07-14T06:50:00.000Z",
        "Report submitted",
        "Pressure complaint filed.",
        "Aarav Sharma",
        "submitted"
      ),
      tl(
        "t2",
        "2026-07-14T10:20:00.000Z",
        "Acknowledged",
        "Water Supply desk acknowledged.",
        "AMC Ops",
        "acknowledged"
      ),
      tl(
        "t3",
        "2026-07-16T09:10:00.000Z",
        "Inspection underway",
        "Pressure logging started on feeder main.",
        "Er. Meera Shah",
        "in_progress"
      ),
    ],
    pointsAwarded: 80,
  },
  {
    id: "rpt-1003",
    title: "Streetlight outage near Law Garden",
    description:
      "Dark stretch on CG Road for three nights. Pedestrians feel unsafe walking home.",
    category: "lighting",
    status: "submitted",
    priority: "medium",
    ward: "Ellisbridge",
    wardId: "w-ellisbridge",
    address: "CG Road, between Law Garden and Panchvati",
    latitude: 23.0228,
    longitude: 72.5711,
    createdAt: "2026-07-17T19:40:00.000Z",
    updatedAt: "2026-07-17T19:40:00.000Z",
    citizenId: "user-citizen-1",
    citizenName: "Aarav Sharma",
    departmentId: "electrical",
    imageUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=600&fit=crop",
    ai: {
      detection: "Non-functional street luminaires",
      damageClass: "Lighting failure",
      severity: "medium",
      summary: "Busy pedestrian corridor — inspect fuse/driver bank.",
      suggestedDepartment: "electrical",
      suggestedPriority: "medium",
      confidence: 0.88,
      authenticity: "likely_true",
      authenticityScore: 0.9,
      priorityScore: 55,
      issueDetected: "Streetlight outage",
      imageRelevant: "relevant",
      imageRelevanceScore: 0.82,
      imageOrigin: "likely_photo",
      imageOriginScore: 0.8,
    },
    timeline: [
      tl(
        "t1",
        "2026-07-17T19:40:00.000Z",
        "Report submitted",
        "Night-time outage reported.",
        "Aarav Sharma",
        "submitted"
      ),
    ],
    pointsAwarded: 50,
  },
  {
    id: "rpt-1008",
    title: "Broken footpath slab near Satellite Crossroads",
    description:
      "Concrete slab lifted and cracked. Elders are stepping onto the carriageway.",
    category: "footpath",
    status: "acknowledged",
    priority: "medium",
    ward: "Satellite",
    wardId: "w-satellite",
    address: "Satellite Crossroads, west footpath",
    latitude: 23.0285,
    longitude: 72.515,
    createdAt: "2026-07-16T17:10:00.000Z",
    updatedAt: "2026-07-17T09:00:00.000Z",
    citizenId: "user-citizen-2",
    citizenName: "Priya Mehta",
    departmentId: "roads",
    imageUrl:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop",
    ai: {
      detection: "Damaged pedestrian footpath slab",
      damageClass: "Footpath hazard",
      severity: "medium",
      summary: "Trip hazard on busy crossing — reset or replace slab.",
      suggestedDepartment: "roads",
      suggestedPriority: "medium",
      confidence: 0.84,
      authenticity: "likely_true",
      authenticityScore: 0.85,
      priorityScore: 58,
      issueDetected: "Broken footpath",
      imageRelevant: "relevant",
      imageRelevanceScore: 0.8,
      imageOrigin: "likely_photo",
      imageOriginScore: 0.78,
    },
    timeline: [
      tl(
        "t1",
        "2026-07-16T17:10:00.000Z",
        "Report submitted",
        "Footpath hazard filed.",
        "Priya Mehta",
        "submitted"
      ),
      tl(
        "t2",
        "2026-07-17T09:00:00.000Z",
        "Acknowledged",
        "Roads desk acknowledged.",
        "AMC Ops",
        "acknowledged"
      ),
    ],
    pointsAwarded: 50,
  },
];

export const cloudDemoNotifications: NotificationItem[] = [
  {
    id: "ntf-demo-1",
    userId: "user-citizen-1",
    title: "Ticket update — streetlight",
    body: "Your Law Garden streetlight report (rpt-1003) is with Electrical for review.",
    createdAt: "2026-07-17T20:05:00.000Z",
    read: false,
    href: "/citizen/reports/rpt-1003",
  },
  {
    id: "ntf-demo-2",
    userId: "user-citizen-2",
    title: "Crew assigned — underpass",
    body: "Drainage crew assigned to your Maninagar waterlogging ticket.",
    createdAt: "2026-07-16T08:45:00.000Z",
    read: false,
    href: "/citizen/reports/rpt-1002",
  },
  {
    id: "ntf-demo-3",
    userId: "user-citizen-3",
    title: "Work started — SG Highway pothole",
    body: "Field crew R-12 started cold-mix patching on your report.",
    createdAt: "2026-07-17T11:10:00.000Z",
    read: true,
    href: "/citizen/reports/rpt-1001",
  },
];

export const cloudDemoLeaderboard: LeaderboardEntry[] = [
  {
    userId: "user-citizen-1",
    rank: 1,
    name: "Aarav Sharma",
    ward: "Vastrapur",
    points: 180,
    reports: 2,
    badges: 1,
  },
  {
    userId: "user-citizen-2",
    rank: 2,
    name: "Priya Mehta",
    ward: "Maninagar",
    points: 170,
    reports: 2,
    badges: 1,
  },
  {
    userId: "user-citizen-3",
    rank: 3,
    name: "Harsh Patel",
    ward: "Thaltej",
    points: 90,
    reports: 1,
    badges: 1,
  },
];

/** Ward open-issue counts tuned to the 5 demo tickets. */
export function cloudDemoWards() {
  const openByWard = new Map<string, number>();
  for (const r of cloudDemoReports) {
    if (r.status === "resolved" || r.status === "rejected") continue;
    openByWard.set(r.wardId, (openByWard.get(r.wardId) ?? 0) + 1);
  }
  return wards.map((w) => ({
    ...w,
    openIssues: openByWard.get(w.id) ?? 0,
  }));
}

export function cloudDemoDepartments() {
  const openByDept = new Map<string, number>();
  for (const r of cloudDemoReports) {
    if (r.status === "resolved" || r.status === "rejected") continue;
    openByDept.set(r.departmentId, (openByDept.get(r.departmentId) ?? 0) + 1);
  }
  return departments.map((d) => ({
    ...d,
    openIssues: openByDept.get(d.id) ?? 0,
  }));
}

export { badges as cloudDemoBadges, rewards as cloudDemoRewards };
