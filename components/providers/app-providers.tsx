"use client";

import { Toaster } from "sonner";
import { ChatWidget } from "@/components/chat/chat-widget";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatWidget />
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}
