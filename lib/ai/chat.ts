import { listReports } from "@/services/store";
import type { InfrastructureReport, SessionUser } from "@/types";
import { statusLabel } from "@/utils/status";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

const APP_FAQ: Array<{ match: RegExp; answer: string }> = [
  {
    match: /how (do i|to) (file|submit|report)|report (an )?issue|new report/i,
    answer:
      "To file a civic issue in Urbanexus: open Report Issue → pick category (roads, water, drainage, etc.) → add title, description, ward/address → attach a clear site photo → submit. You’ll land on a ticket page with status, civic points, and AI triage notes. Tip: use a photo of the defect (pothole, drain, lamp), not a selfie.",
  },
  {
    match: /demo (login|account|password)|sign in|credentials|test user/i,
    answer:
      "Demo logins:\n• Citizen: aarav.sharma@gmail.com / demo1234\n• City HQ: admin@amc.gov.in / admin1234\n• Ward desk (example): thaltej.admin@amc.gov.in / ward1234\nUse Sign in from the top nav, then you’ll enter the citizen or AMC command center.",
  },
  {
    match:
      /how (does|do) (ticket |report )?status|status (progress|workflow|flow)|what (are|is) (the )?status/i,
    answer:
      "Ticket statuses move as AMC updates them: Submitted → Acknowledged → Assigned → In progress → Resolved. Citizens see progress on the ticket page; ward desks and City HQ change status from the admin Reports inbox. Ask “my report status” for your live tickets.",
  },
  {
    match: /ai lab|confidence|authenticity|triage|fraud score/i,
    answer:
      "Urbanexus uses Exa AI for triage: category/department routing, priority, authenticity, and photo relevance. AI Lab (/ai) shows fraud scores, citywide predictions, and department pulse. High confidence needs a clear description + a site photo of the actual defect — gibberish text or selfie photos lower trust scores.",
  },
  {
    match: /^(where('s| is) )?(the )?map\b|heatmap|gis map|open (city )?map/i,
    answer:
      "Open City Map (/map) for Ahmedabad GIS: clustered reports, heatmap of issue density, and filters by category/status. Ward-scoped admins only see their managed wards; City HQ sees citywide.",
  },
  {
    match: /points|reward|leaderboard/i,
    answer:
      "Civic points: Critical +120, High +80, Medium +50, Low +25 when a report enters the AMC queue. Clear site photo +10. AMC resolve +25. Rejected/fake reports get 0 (points clawed back). See Rewards for the full criteria table and Leaderboard for live ranks.",
  },
];

export function tryLocalFaq(message: string): string | null {
  const hit = APP_FAQ.find((item) => item.match.test(message));
  return hit?.answer ?? null;
}

function openStatuses(r: InfrastructureReport) {
  return r.status !== "resolved" && r.status !== "rejected";
}

function roadsLike(r: InfrastructureReport) {
  return (
    r.category === "roads" ||
    r.category === "footpath" ||
    r.departmentId === "roads"
  );
}

function formatTicketLine(r: InfrastructureReport) {
  return `- ${r.title}\n  ${statusLabel(r.status)} | ${r.priority} | ${r.ward}\n  Open: /citizen/reports/${r.id}`;
}

/** Answer from live Urbanexus tickets before falling back to FAQ / Exa web search. */
export async function tryLiveDataAnswer(input: {
  message: string;
  session: SessionUser | null;
}): Promise<string | null> {
  const q = input.message.trim();
  const name = input.session?.name?.split(" ")[0] || "there";
  const all = await listReports();

  const wantsMyStatus =
    /\b(my|mine|our)\b.*\b(report|ticket|status|complaint)\b/i.test(q) ||
    /\b(report|ticket)\b.*\b(status|update)\b/i.test(q) ||
    /^(status|updates?)(\s+please)?$/i.test(q) ||
    /where is my (report|ticket)/i.test(q);

  if (wantsMyStatus) {
    if (!input.session) {
      return "Sign in to see your live ticket status. Demo citizen: aarav.sharma@gmail.com / demo1234 — then ask me again.";
    }

    const mine = all
      .filter((r) => r.citizenId === input.session!.id)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

    if (!mine.length) {
      return `${name}, you do not have any tickets in Urbanexus yet. File one under Report Issue - pin the spot on the map and add a clear site photo.`;
    }

    const open = mine.filter(openStatuses);
    const lines = mine.slice(0, 5).map(formatTicketLine).join("\n\n");
    return [
      `${name}, here is your live report status from Urbanexus (${mine.length} total, ${open.length} still open):`,
      "",
      lines,
      "",
      mine.length > 5
        ? `Showing your 5 most recent. Full list: /citizen/reports`
        : `Full list: /citizen/reports`,
    ].join("\n");
  }

  const wantsWorstRoads =
    /\b(worst|bad|poor|terrible)\b.*\b(road|roads|pothole|street)\b/i.test(q) ||
    /\b(road|roads|pothole)\b.*\b(worst|bad|poor|which (ward|region|area))\b/i.test(
      q
    ) ||
    /which (ward|region|area).*(road|pothole)/i.test(q) ||
    /(road|roads).*(ward|region|area)/i.test(q);

  if (wantsWorstRoads) {
    const roadOpen = all.filter((r) => roadsLike(r) && openStatuses(r));
    const byWard = new Map<string, { count: number; critical: number; sample: string }>();

    for (const r of roadOpen) {
      const cur = byWard.get(r.ward) ?? {
        count: 0,
        critical: 0,
        sample: r.title,
      };
      cur.count += 1;
      if (r.priority === "critical" || r.priority === "high") cur.critical += 1;
      byWard.set(r.ward, cur);
    }

    const ranked = Array.from(byWard.entries())
      .map(([ward, stats]) => ({
        ward,
        ...stats,
        score: stats.count * 2 + stats.critical * 3,
      }))
      .sort((a, b) => b.score - a.score || b.count - a.count);

    if (!ranked.length) {
      return `${name}, Urbanexus currently has no open road / footpath tickets citywide - either the roads desk is clear, or new reports have not been filed yet. You can still report a pothole under Report Issue.`;
    }

    const top = ranked.slice(0, 5);
    const lines = top
      .map(
        (w, i) =>
          `${i + 1}. ${w.ward} - ${w.count} open road ticket${w.count === 1 ? "" : "s"} (${w.critical} high/critical)\n   e.g. ${w.sample}`
      )
      .join("\n");

    return [
      `${name}, based on live Urbanexus open tickets (not an official AMC ranking), these wards show the heaviest road pressure right now:`,
      "",
      lines,
      "",
      `Your home ward (${input.session?.ward ?? "-"}): ${
        byWard.get(input.session?.ward ?? "")?.count ?? 0
      } open road ticket(s).`,
      "Explore the map: /map | File a new road report: /citizen/reports/new",
    ].join("\n");
  }

  return null;
}

export function buildChatQuery(input: {
  message: string;
  history: ChatMessage[];
  role?: string | null;
  ward?: string | null;
  name?: string | null;
  liveContext?: string | null;
}): string {
  const historyBlock = input.history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Citizen/Officer" : "Assistant"}: ${m.content}`)
    .join("\n");

  const persona =
    input.role === "admin" || input.role === "officer"
      ? "You are assisting an AMC ward / city operations officer inside Urbanexus."
      : "You are assisting an Ahmedabad citizen using Urbanexus.";

  return [
    "You are Nexus, the Urbanexus civic AI assistant for Ahmedabad Municipal Corporation (AMC).",
    persona,
    input.name ? `Address the user as ${input.name} when natural.` : "",
    "Answer clearly in plain English (short paragraphs or bullets). Focus on civic infrastructure, reporting issues, wards, departments, monsoon readiness, and how to use the Urbanexus app.",
    "Prefer Urbanexus live ticket facts from the context below over generic web news. Do not invent ticket IDs.",
    input.ward ? `User ward context: ${input.ward}.` : "User ward context: citywide Ahmedabad.",
    input.liveContext ? `Live Urbanexus data:\n${input.liveContext}` : "",
    historyBlock ? `Recent conversation:\n${historyBlock}` : "",
    `Current question: ${input.message}`,
    "Provide a helpful answer now.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function buildLiveContextSnippet(
  session: SessionUser | null
): Promise<string> {
  const all = await listReports();
  const open = all.filter(openStatuses);
  const roadOpen = open.filter(roadsLike);
  const byWard = new Map<string, number>();
  for (const r of roadOpen) {
    byWard.set(r.ward, (byWard.get(r.ward) ?? 0) + 1);
  }
  const topWards = Array.from(byWard.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w, c]) => `${w} (${c})`)
    .join(", ");

  const mine = session
    ? all
        .filter((r) => r.citizenId === session.id)
        .slice(0, 4)
        .map(
          (r) =>
            `${r.id}: ${r.title} [${statusLabel(r.status)}/${r.priority}/${r.ward}]`
        )
        .join("; ")
    : "not signed in";

  return [
    `Open tickets citywide: ${open.length}. Open road tickets: ${roadOpen.length}.`,
    `Top road-pressure wards: ${topWards || "none"}.`,
    `User tickets: ${mine || "none"}.`,
  ].join("\n");
}
