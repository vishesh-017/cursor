"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Full-page chat already mounts ChatPanel — skip the floating bubble there.
  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto w-[min(400px,calc(100vw-2rem))]"
          >
            <ChatPanel
              compact
              showExpandLink
              onClose={() => setOpen(false)}
              className="h-[min(560px,calc(100vh-7rem))] shadow-2xl shadow-slate-950/25"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-14 items-center gap-2 rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-lg shadow-teal-950/30"
        aria-label={open ? "Close Nexus chat" : "Open Nexus chat"}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Ask Nexus</span>
            <Sparkles className="h-4 w-4 opacity-90" />
          </>
        )}
      </motion.button>
    </div>
  );
}
