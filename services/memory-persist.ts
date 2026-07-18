import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  InfrastructureReport,
  NotificationItem,
  UserModerationEvent,
  UserProfile,
} from "@/types";

export type PersistedStore = {
  reports: InfrastructureReport[];
  notifications: NotificationItem[];
  users: UserProfile[];
  moderationEvents: UserModerationEvent[];
  savedAt: string;
};

function persistDir() {
  // Prefer project .data locally; fall back to /tmp on serverless hosts.
  const local = join(process.cwd(), ".data");
  try {
    if (!existsSync(local)) mkdirSync(local, { recursive: true });
    return local;
  } catch {
    return join("/tmp", "urbanexus-data");
  }
}

function persistPath() {
  return join(persistDir(), "urbanexus-store.json");
}

/** Load durable memory snapshot if present (survives turbopack/dev restarts). */
export function loadPersistedStore(): PersistedStore | null {
  try {
    const path = persistPath();
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as PersistedStore;
    if (!Array.isArray(parsed?.reports) || !Array.isArray(parsed?.notifications)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Write store snapshot so create/detail share the same reports across workers. */
export function savePersistedStore(store: {
  reports: InfrastructureReport[];
  notifications: NotificationItem[];
  users: UserProfile[];
  moderationEvents: UserModerationEvent[];
}) {
  try {
    const dir = persistDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const payload: PersistedStore = {
      reports: store.reports,
      notifications: store.notifications,
      users: store.users,
      moderationEvents: store.moderationEvents,
      savedAt: new Date().toISOString(),
    };
    writeFileSync(persistPath(), JSON.stringify(payload), "utf8");
  } catch {
    // Persistence is best-effort — never break API responses.
  }
}
