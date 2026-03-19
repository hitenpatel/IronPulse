"use client";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

export function useMessageStream() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const eventSource = new EventSource("/api/messages/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_messages") {
        // Invalidate message queries to refresh the UI
        utils.message.conversations.invalidate();
        utils.message.history.invalidate();
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => eventSource.close();
  }, [utils]);
}
