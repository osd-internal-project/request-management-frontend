"use client";

import { Button } from "antd";
import { AssistantIcon } from "@/components/layout/chat/assistant-icon";
import { messages } from "@/lib/messages";

/** The header's AI-assistant button; filled while the panel is open. */
export function ChatToggleButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      shape="round"
      type={open ? "primary" : "default"}
      // Brand blue while closed; the primary (open) button turns it white.
      icon={<AssistantIcon className={open ? undefined : "text-[var(--app-primary)]"} />}
      aria-pressed={open}
      aria-label={messages.chat.toggle}
      onClick={onClick}
    >
      <span className="max-md:hidden">{messages.chat.title}</span>
    </Button>
  );
}
