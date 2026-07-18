import { listReports } from "@/services/store";
import type {
  InfrastructureReport,
  ReportCategory,
  SessionUser,
} from "@/types";
import { statusLabel } from "@/utils/status";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

const WARD_NAMES = [
  "Thaltej",
  "Vastrapur",
  "Ellisbridge",
  "Maninagar",
  "Bopal",
  "Naroda",
  "Satellite",
  "Ghodasar",
] as const;

const CATEGORY_PATTERNS: Array<{
  category: ReportCategory | "roads";
  match: RegExp;
  label: string;
}> = [
  {
    category: "roads",
    match: /\b(road|roads|pothole|street|asphalt|footpath|sidewalk)\b/i,
    label: "roads / footpath",
  },
  {
    category: "water",
    match: /\b(water|pipeline|leak|supply|tap)\b/i,
    label: "water supply",
  },
  {
    category: "drainage",
    match:
      /\b(drain|drainage|waterlog|flood|storm\s?water|sewer|underpass)\b/i,
    label: "drainage / storm water",
  },
  {
    category: "lighting",
    match: /\b(light|lighting|streetlight|lamp|electrical|dark)\b/i,
    label: "street lighting",
  },
  {
    category: "waste",
    match: /\b(waste|garbage|trash|dump|sanitation|solid waste)\b/i,
    label: "waste / sanitation",
  },
];

const APP_FAQ: Array<{ match: RegExp; answer: string }> = [
  {
    match: /^(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/i,
    answer:
      "Hi — I'm Nexus, Urbanexus civic assistant for Ahmedabad. Ask me about your tickets, open issues by ward/category, the priority queue, points, map, or how to file a report.",
  },
  {
    match:
      /what can you (do|help)|help me|how (can|do) (you|i) use (you|nexus)|capabilities/i,
    answer:
      "I can answer from live Urbanexus data:\n• Your ticket status\n• Open / critical / unassigned queues\n• Issues by ward (e.g. Maninagar) or category (roads, water, drainage…)\n• Lookup by ticket id (rpt-…)\n• Points, AI Lab, map, demo logins\nTry: “critical tickets”, “open in Thaltej”, “my report status”.",
  },
  {
    match: /how (do i|to) (file|submit|report)|report (an )?issue|new report|pothole/i,
    answer:
      "To file a civic issue: Report Issue → category → title + short description → ward/address → clear site photo → submit. Tip: photo of the defect, not a selfie. Path: /citizen/reports/new",
  },
  {
    match: /demo (login|account|password)|sign in|credentials|test user/i,
    answer:
      "Demo logins:\n• Citizen: aarav.sharma@gmail.com / demo1234\n• City HQ: admin@amc.gov.in / admin1234\n• Ward desk: thaltej.admin@amc.gov.in / ward1234",
  },
  {
    match:
      /how (does|do) (ticket |report )?status|status (progress|workflow|flow)|what (are|is) (the )?status(es)?\b/i,
    answer:
      "Statuses: Submitted → Acknowledged → Assigned → In progress → Resolved (or Rejected). Ask “my report status” for your live tickets.",
  },
  {
    match: /ai lab|confidence|authenticity|triage|fraud score|photo (ai|fake|evidence)/i,
    answer:
      "AI Lab (/ai) covers triage, authenticity, photo relevance (AI/unrelated uploads), fraud signals, and department pulse. Admins also see evidence chips on Priority Queue and report detail.",
  },
  {
    match: /^(where('s| is) )?(the )?map\b|heatmap|gis map|open (city )?map/i,
    answer:
      "City Map: /map — clusters, heatmap, category/status filters. Ward desks only see their wards; City HQ is citywide.",
  },
  {
    match: /\b(points|reward|leaderboard|badges)\b/i,
    answer:
      "Civic points: Critical +120, High +80, Medium +50, Low +25 on queue entry. Clear site photo +10. Resolve +25. Reject claws back. See /citizen/rewards and /citizen/leaderboard.",
  },
  {
    match: /priority queue|escalat/i,
    answer:
      "Priority Queue (/admin/priority) ranks open urgent tickets by Exa triage score. Ask “show critical tickets” for the live list.",
  },
  {
    match: /database|supabase|multi.?device|other laptop|sync/i,
    answer:
      "Multi-laptop sync needs Supabase keys in .env.local (same on every machine). Setup: /admin/database — run the SQL migration, seed, then reports appear on all devices.",
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

function matchesCategory(
  r: InfrastructureReport,
  category: ReportCategory | "roads"
) {
  if (category === "roads") return roadsLike(r);
  return r.category === category || r.departmentId === category;
}

function formatTicketLine(r: InfrastructureReport) {
  return `- ${r.title}\n  ${statusLabel(r.status)} | ${r.priority} | ${r.ward} | ${r.id}\n  Open: /citizen/reports/${r.id}`;
}

function detectWard(q: string): string | null {
  const lower = q.toLowerCase();
  for (const ward of WARD_NAMES) {
    if (lower.includes(ward.toLowerCase())) return ward;
  }
  return null;
}

function detectCategory(q: string) {
  return CATEGORY_PATTERNS.find((c) => c.match.test(q)) ?? null;
}

function extractReportId(q: string): string | null {
  const m = q.match(/\b(rpt-?\d+)\b/i);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  return raw.startsWith("rpt-") ? raw : raw.replace(/^rpt/, "rpt-");
}

function rankByPriority(a: InfrastructureReport, b: InfrastructureReport) {
  const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const d = order[a.priority] - order[b.priority];
  if (d !== 0) return d;
  return +new Date(b.updatedAt) - +new Date(a.updatedAt);
}

function listBlock(
  name: string,
  intro: string,
  items: InfrastructureReport[],
  empty: string,
  limit = 6
) {
  if (!items.length) return `${name}, ${empty}`;
  const lines = items.slice(0, limit).map(formatTicketLine).join("\n\n");
  const more =
    items.length > limit
      ? `\n\nShowing ${limit} of ${items.length}. Full inbox: /admin/reports`
      : "";
  return [`${name}, ${intro}`, "", lines, more].filter(Boolean).join("\n");
}

/** Answer from live Urbanexus tickets before falling back to FAQ / Exa web search. */
export async function tryLiveDataAnswer(input: {
  message: string;
  session: SessionUser | null;
}): Promise<string | null> {
  const q = input.message.trim();
  const name = input.session?.name?.split(" ")[0] || "there";
  const all = await listReports();
  const open = all.filter(openStatuses);

  // Ticket id lookup
  const reportId = extractReportId(q);
  if (reportId || /\b(ticket|report)\s*(id|#)?\s*[:#]?\s*rpt/i.test(q)) {
    const id = reportId;
    if (id) {
      const hit =
        all.find((r) => r.id.toLowerCase() === id) ||
        all.find((r) => r.id.toLowerCase().includes(id.replace("rpt-", "")));
      if (hit) {
        return [
          `${name}, here is live ticket ${hit.id}:`,
          "",
          formatTicketLine(hit),
          "",
          hit.description
            ? `Note: ${hit.description.split(/\s+/).slice(0, 28).join(" ")}${hit.description.split(/\s+/).length > 28 ? "…" : ""}`
            : "",
          `Admin desk: /admin/reports/${hit.id}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
      return `${name}, I could not find ticket ${id} in Urbanexus. Check the id on /citizen/reports or /admin/reports.`;
    }
  }

  // My status
  const wantsMyStatus =
    /\b(my|mine|our)\b.*\b(report|ticket|status|complaint|issue)\b/i.test(q) ||
    /\b(report|ticket)\b.*\b(status|update)\b/i.test(q) ||
    /^(status|updates?)(\s+please)?$/i.test(q) ||
    /where is my (report|ticket)/i.test(q);

  if (wantsMyStatus) {
    if (!input.session) {
      return "Sign in to see your live ticket status. Demo citizen: aarav.sharma@gmail.com / demo1234 — then ask again.";
    }
    const mine = all
      .filter((r) => r.citizenId === input.session!.id)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    if (!mine.length) {
      return `${name}, you do not have any tickets yet. File one: /citizen/reports/new`;
    }
    const openMine = mine.filter(openStatuses);
    return [
      `${name}, your live reports (${mine.length} total, ${openMine.length} open):`,
      "",
      mine.slice(0, 6).map(formatTicketLine).join("\n\n"),
      "",
      "Full list: /citizen/reports",
    ].join("\n");
  }

  // City overview / pulse
  const wantsOverview =
    /\b(how many|count|overview|summary|pulse|citywide|city wide|dashboard)\b/i.test(
      q
    ) ||
    /\b(open (tickets|reports|issues)|total open)\b/i.test(q) ||
    /what('s| is) (going on|happening|open)/i.test(q);

  if (wantsOverview && !detectWard(q) && !detectCategory(q)) {
    const critical = open.filter((r) => r.priority === "critical").length;
    const high = open.filter((r) => r.priority === "high").length;
    const byCat = new Map<string, number>();
    for (const r of open) {
      byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
    }
    const topCats = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c, n]) => `${c} (${n})`)
      .join(", ");
    const byWard = new Map<string, number>();
    for (const r of open) {
      byWard.set(r.ward, (byWard.get(r.ward) ?? 0) + 1);
    }
    const topWards = Array.from(byWard.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w, n]) => `${w} (${n})`)
      .join(", ");

    return [
      `${name}, live Urbanexus city pulse:`,
      `• Open tickets: ${open.length} (critical ${critical}, high ${high})`,
      `• By category: ${topCats || "none"}`,
      `• Busiest wards: ${topWards || "none"}`,
      input.session?.ward
        ? `• Your ward (${input.session.ward}): ${byWard.get(input.session.ward) ?? 0} open`
        : "",
      "",
      "Dig deeper: “critical tickets”, “open in Maninagar”, “drainage issues”.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // Critical / priority / urgent
  const wantsCritical =
    /\b(critical|urgent|emergency|escalate|priority queue|high priority)\b/i.test(
      q
    );

  if (wantsCritical) {
    const urgent = open
      .filter((r) => r.priority === "critical" || r.priority === "high")
      .sort(rankByPriority);
    return listBlock(
      name,
      `live high-urgency open tickets (${urgent.length}):`,
      urgent,
      "there are no open critical/high tickets right now. Priority Queue: /admin/priority",
      8
    );
  }

  // Unassigned
  if (/\bunassigned\b|\bnot assigned\b|\bno assignee\b/i.test(q)) {
    const unassigned = open
      .filter((r) => !r.assignedTo)
      .sort(rankByPriority);
    return listBlock(
      name,
      `open tickets with no assignee (${unassigned.length}):`,
      unassigned,
      "every open ticket currently has an assignee.",
      8
    );
  }

  // Photo / AI evidence risk (admin-ish)
  if (
    /\b(ai[ -]?generated|fake photo|photo (risk|evidence|issue)|improper (photo|image)|unrelated (photo|image))\b/i.test(
      q
    )
  ) {
    const risky = open.filter((r) => {
      const ai = r.ai;
      if (!ai) return false;
      if (ai.authenticity === "possibly_fake") return true;
      if (ai.imageOrigin === "possibly_ai_generated") return true;
      if (ai.imageRelevant === "not_relevant") return true;
      if (ai.imageOrigin === "uncertain" || ai.imageRelevant === "uncertain") {
        return true;
      }
      return false;
    });
    return listBlock(
      name,
      `open tickets with photo / authenticity risk (${risky.length}):`,
      risky,
      "no open tickets currently flag AI/unrelated photo risk.",
      8
    );
  }

  // My ward
  const wantsMyWard =
    /\b(my ward|home ward|our ward)\b/i.test(q) ||
    (/\bin my (area|locality|neighbourhood|neighborhood)\b/i.test(q) &&
      Boolean(input.session?.ward));

  const ward =
    detectWard(q) ||
    (wantsMyWard ? input.session?.ward ?? null : null);

  const categoryHit = detectCategory(q);
  const isHowTo = /\bhow (do i|to|can i)\b|\bsteps? to\b/i.test(q);

  // Ward and/or category filter (skip pure how-to — FAQ handles filing)
  if (!isHowTo && (ward || categoryHit)) {
    const looksLikeList =
      Boolean(ward) ||
      Boolean(categoryHit) ||
      /\b(open|issues?|tickets?|reports?|problems?|complaints?|show|list|any|in)\b/i.test(
        q
      );

    if (looksLikeList) {
      let filtered = open;
      const bits: string[] = [];

      if (ward) {
        filtered = filtered.filter(
          (r) => r.ward.toLowerCase() === ward.toLowerCase()
        );
        bits.push(ward);
      }
      if (categoryHit) {
        filtered = filtered.filter((r) =>
          matchesCategory(r, categoryHit.category)
        );
        bits.push(categoryHit.label);
      }

      filtered = [...filtered].sort(rankByPriority);
      const label = bits.join(" · ");
      return listBlock(
        name,
        `open ${label} tickets (${filtered.length}):`,
        filtered,
        `no open ${label} tickets in Urbanexus right now.`,
        8
      );
    }
  }

  // Worst roads / ward pressure (roads-focused)
  const wantsWorstRoads =
    /\b(worst|bad|poor|terrible|heaviest)\b.*\b(road|roads|pothole|street)\b/i.test(
      q
    ) ||
    /\b(road|roads|pothole)\b.*\b(worst|bad|poor|which (ward|region|area))\b/i.test(
      q
    ) ||
    /which (ward|region|area).*(road|pothole)/i.test(q);

  if (wantsWorstRoads) {
    const roadOpen = open.filter(roadsLike);
    const byWard = new Map<
      string,
      { count: number; critical: number; sample: string }
    >();
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
      .map(([w, stats]) => ({
        ward: w,
        ...stats,
        score: stats.count * 2 + stats.critical * 3,
      }))
      .sort((a, b) => b.score - a.score || b.count - a.count);

    if (!ranked.length) {
      return `${name}, no open road / footpath tickets citywide right now. Report one: /citizen/reports/new`;
    }
    const lines = ranked
      .slice(0, 5)
      .map(
        (w, i) =>
          `${i + 1}. ${w.ward} — ${w.count} open (${w.critical} high/critical)\n   e.g. ${w.sample}`
      )
      .join("\n");
    return [
      `${name}, live road pressure by ward (open tickets):`,
      "",
      lines,
      "",
      `Your ward (${input.session?.ward ?? "-"}): ${
        byWard.get(input.session?.ward ?? "")?.count ?? 0
      } open road ticket(s).`,
      "Map: /map",
    ].join("\n");
  }

  // Keyword search across titles/descriptions when question looks like a search
  const searchLike =
    /\b(find|search|show|list|any|about)\b/i.test(q) ||
    /\b(waterlogging|underpass|pothole|streetlight|garbage|leak)\b/i.test(q);

  if (searchLike && q.length >= 4) {
    const tokens = q
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter(
        (t) =>
          t.length > 3 &&
          ![
            "find",
            "search",
            "show",
            "list",
            "about",
            "open",
            "ticket",
            "tickets",
            "report",
            "reports",
            "issue",
            "issues",
            "please",
            "what",
            "which",
            "where",
            "with",
            "from",
            "that",
            "this",
            "have",
            "ward",
            "ahmedabad",
            "urbanexus",
          ].includes(t)
      );

    if (tokens.length) {
      const hits = open
        .filter((r) => {
          const hay =
            `${r.title} ${r.description} ${r.address} ${r.ward} ${r.category}`.toLowerCase();
          return tokens.some((t) => hay.includes(t));
        })
        .sort(rankByPriority);

      if (hits.length) {
        return listBlock(
          name,
          `open tickets matching your question (${hits.length}):`,
          hits,
          "no matches.",
          6
        );
      }
    }
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
    .map(
      (m) =>
        `${m.role === "user" ? "Citizen/Officer" : "Assistant"}: ${m.content}`
    )
    .join("\n");

  const persona =
    input.role === "admin" || input.role === "officer"
      ? "You are assisting an AMC ward / city operations officer inside Urbanexus."
      : "You are assisting an Ahmedabad citizen using Urbanexus.";

  return [
    "You are Nexus, the Urbanexus civic AI assistant for Ahmedabad Municipal Corporation (AMC).",
    persona,
    input.name ? `Address the user as ${input.name} when natural.` : "",
    "Answer clearly in plain English (short paragraphs or bullets).",
    "Topics: civic infrastructure, filing reports, wards, departments, monsoon, Urbanexus app features, AMC ops.",
    "Prefer Urbanexus live ticket facts from the context below over generic web news. Never invent ticket IDs or citizen names.",
    "If the question is about this app's live data and context is insufficient, say what to ask next (e.g. my report status, open in Maninagar).",
    input.ward
      ? `User ward context: ${input.ward}.`
      : "User ward context: citywide Ahmedabad.",
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
  const critical = open.filter((r) => r.priority === "critical");
  const high = open.filter((r) => r.priority === "high");
  const unassigned = open.filter((r) => !r.assignedTo);

  const byCat = new Map<string, number>();
  const byWard = new Map<string, number>();
  for (const r of open) {
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
    byWard.set(r.ward, (byWard.get(r.ward) ?? 0) + 1);
  }

  const topCats = Array.from(byCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w, c]) => `${w}:${c}`)
    .join(", ");

  const topWards = Array.from(byWard.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w, c]) => `${w}:${c}`)
    .join(", ");

  const sampleCritical = critical
    .slice(0, 3)
    .map((r) => `${r.id} ${r.title} (${r.ward}/${r.priority})`)
    .join("; ");

  const mine = session
    ? all
        .filter((r) => r.citizenId === session.id)
        .slice(0, 5)
        .map(
          (r) =>
            `${r.id}: ${r.title} [${statusLabel(r.status)}/${r.priority}/${r.ward}]`
        )
        .join("; ")
    : "not signed in";

  const recent = [...open]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5)
    .map((r) => `${r.id} ${r.title} (${r.ward})`)
    .join("; ");

  return [
    `Open tickets: ${open.length} (critical ${critical.length}, high ${high.length}, unassigned ${unassigned.length}).`,
    `Categories: ${topCats || "none"}.`,
    `Wards: ${topWards || "none"}.`,
    `Critical samples: ${sampleCritical || "none"}.`,
    `Recent open: ${recent || "none"}.`,
    `User tickets: ${mine || "none"}.`,
    `Session: ${session ? `${session.name} / ${session.role} / ${session.ward}` : "guest"}.`,
  ].join("\n");
}

/** Last-resort answer from live data when Exa is offline or fails. */
export async function buildOfflineHelperAnswer(input: {
  message: string;
  session: SessionUser | null;
  liveContext: string;
}): Promise<string> {
  const live = await tryLiveDataAnswer({
    message: input.message,
    session: input.session,
  });
  if (live) return live;

  const faq = tryLocalFaq(input.message);
  if (faq) return faq;

  const name = input.session?.name?.split(" ")[0] || "there";
  return [
    sessionHello(input.session, name),
    "",
    "I could not reach Exa web answers just now, but Urbanexus live data is available:",
    input.liveContext,
    "",
    "Try asking:",
    '• "my report status"',
    '• "critical tickets"',
    '• "open in Maninagar"',
    '• "drainage issues"',
    '• "how many open tickets"',
    '• "ticket rpt-1002"',
  ].join("\n");
}

function sessionHello(session: SessionUser | null, name: string) {
  return session
    ? `Hi ${name} — Exa web search is offline, but I can still use Urbanexus tickets.`
    : "Exa web search is offline, but I can still help with Urbanexus basics.";
}
