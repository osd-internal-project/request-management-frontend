"use client";

import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  LibreChatWidget,
  type ChatWidgetConfig,
} from "@/components/layout/librechat-widget";
import { messages } from "@/lib/messages";

/**
 * The frame around the AI chat widget. It owns its own border and title bar —
 * how wide it is, and whether it is a split pane or a drawer, is the shell's
 * decision. `widget` is null when the server env leaves it unconfigured.
 */
export function ChatPanel({
  widget,
  onClose,
}: {
  widget: ChatWidgetConfig | null;
  onClose: () => void;
}) {
  return (
    <section className="flex h-full flex-col border-l border-[var(--app-border-soft)] bg-white">
      {/* <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <span className="font-medium">{messages.chat.title}</span>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          aria-label={messages.chat.close}
        />
      </div> */}

      {/* min-h-0 so a widget that scrolls itself can, instead of stretching. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {widget ? (
          <LibreChatWidget widget={widget} />
        ) : (
          <p className="p-4 text-[var(--app-text-muted)]">
            {messages.chat.notConfigured}
          </p>
        )}
      </div>
    </section>
  );
}
