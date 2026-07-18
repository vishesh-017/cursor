"use client";

import { useEffect, useRef } from "react";

/**
 * Re-run a loader on an interval (and when the tab becomes visible).
 * Used so a second laptop sees new reports without a manual refresh.
 */
export function useLivePoll(
  load: () => void | Promise<void>,
  options?: { intervalMs?: number; enabled?: boolean }
) {
  const { intervalMs = 8000, enabled = true } = options ?? {};
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      void loadRef.current();
    };

    const id = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs]);
}
