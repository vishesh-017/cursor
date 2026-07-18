import type { InfrastructureReport } from "@/types";

const KEY = "urbanexus:report-cache";
const MAX = 12;

type CacheMap = Record<string, InfrastructureReport>;

function read(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheMap;
  } catch {
    return {};
  }
}

function write(map: CacheMap) {
  if (typeof window === "undefined") return;
  try {
    const ids = Object.keys(map);
    if (ids.length > MAX) {
      const trimmed = ids.slice(0, MAX);
      const next: CacheMap = {};
      for (const id of trimmed) next[id] = map[id];
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded (large photos) — store a slim copy without data URLs.
    try {
      const slim: CacheMap = {};
      for (const [id, report] of Object.entries(map)) {
        slim[id] = {
          ...report,
          imageUrl: report.imageUrl?.startsWith("data:")
            ? undefined
            : report.imageUrl,
          imageUrls: report.imageUrls
            ?.filter((u) => !u.startsWith("data:"))
            .slice(0, 1),
        };
      }
      sessionStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      // ignore
    }
  }
}

export function cacheReport(report: InfrastructureReport) {
  const map = read();
  map[report.id] = report;
  write(map);
}

export function getCachedReport(id: string): InfrastructureReport | null {
  return read()[id] ?? null;
}
