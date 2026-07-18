"use client";

import { MapWorkspace } from "@/components/map/map-workspace";
import { useEffect, useState } from "react";

export default function MapPage() {
  const [framed, setFramed] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { success?: boolean; data?: { user?: unknown } }) => {
        setFramed(Boolean(json.success && json.data?.user));
      })
      .catch(() => setFramed(false));
  }, []);

  return <MapWorkspace framed={framed} />;
}
