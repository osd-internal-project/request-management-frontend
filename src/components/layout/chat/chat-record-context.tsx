"use client";

import { useEffect } from "react";
import {
  clearChatContext,
  updateChatContext,
  type ChatContext,
} from "@/components/layout/chat/chat-context";

/**
 * Tells the AI assistant which record a server-rendered page shows, for as
 * long as the page is mounted. Renders nothing.
 */
export function ChatRecordContext({ context }: { context: ChatContext }) {
  const { id, type, title, content } = context;

  useEffect(() => {
    updateChatContext({ id, type, title, content }, "record");
    return () => clearChatContext("record");
  }, [id, type, title, content]);

  return null;
}
