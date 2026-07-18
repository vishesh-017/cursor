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
    match: /status|submitted|in.?progress|resolved|queue/i,
    answer:
      "Ticket statuses move as AMC updates them: Submitted → In review / queued → In progress → Resolved (wording may vary slightly in the UI). Citizens see resolution progress on the ticket page; ward desks and City HQ change status from the admin Reports inbox.",
  },
  {
    match: /ai lab|confidence|authenticity|triage/i,
    answer:
      "Urbanexus uses Exa AI for triage: category/department routing, priority, authenticity, and photo relevance. AI Lab (/ai) shows citywide predictions and department pulse. High confidence needs a clear description + a site photo of the actual defect — gibberish text or selfie photos lower trust scores.",
  },
  {
    match: /map|heatmap|gis|ward/i,
    answer:
      "Open City Map (/map) for Ahmedabad GIS: clustered reports, heatmap of issue density, and filters by category/status. Ward-scoped admins only see their managed wards; City HQ sees citywide.",
  },
  {
    match: /points|reward|leaderboard/i,
    answer:
      "Citizens earn civic points when a report enters the AMC queue. Check Rewards and Leaderboard in the citizen sidebar for your balance and ranking.",
  },
];

export function tryLocalFaq(message: string): string | null {
  const hit = APP_FAQ.find((item) => item.match.test(message));
  return hit?.answer ?? null;
}

export function buildChatQuery(input: {
  message: string;
  history: ChatMessage[];
  role?: string | null;
  ward?: string | null;
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
    "Answer clearly in plain English (short paragraphs or bullets). Focus on civic infrastructure, reporting issues, wards, departments (roads, water, drainage, electrical, sanitation, town-planning), monsoon readiness, and how to use the Urbanexus app.",
    "If the question is about filing a report, statuses, demo login, map, or AI Lab, give practical in-app steps.",
    "Do not invent ticket IDs or claim a specific report was fixed unless the user provided that data.",
    input.ward ? `User ward context: ${input.ward}.` : "User ward context: citywide Ahmedabad.",
    historyBlock ? `Recent conversation:\n${historyBlock}` : "",
    `Current question: ${input.message}`,
    "Provide a helpful answer now.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
