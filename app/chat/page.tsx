import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata: Metadata = {
  title: "Nexus Chat",
  description: "Ask Nexus — Urbanexus civic AI assistant for Ahmedabad.",
};

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
          Civic assistant
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--foreground)]">
          Chat with Nexus
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Get help filing reports, understanding ticket status, navigating wards,
          or asking Ahmedabad infrastructure questions powered by Exa.
        </p>
      </div>
      <ChatPanel className="min-h-[70vh]" />
    </div>
  );
}
