"use client";

import { Button, Tooltip } from "antd";
import {
  DoubleRightOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import {
  LibreChatWidget,
  type ChatWidgetConfig,
} from "@/components/layout/chat/librechat-widget";
import type { ChatDockMode } from "@/components/layout/chat/use-chat-dock";
import { messages } from "@/lib/messages";

/**
 * The frame around the AI chat widget: title bar plus widget. How wide it is,
 * and whether it is a split pane or a drawer, is the shell's decision.
 * `widget` is null when the server env leaves it unconfigured.
 */
export function ChatPanel({
  widget,
  mode,
  canExpand,
  onClose,
  onExpand,
  onDock,
}: {
  widget: ChatWidgetConfig | null;
  mode: ChatDockMode;
  /** False in the mobile drawer, which is already full screen. */
  canExpand: boolean;
  onClose: () => void;
  onExpand: () => void;
  onDock: () => void;
}) {
  const expanded = mode === "expanded";

  return (
    <section className="flex h-full flex-col border-l border-[var(--app-border-soft)] bg-white">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--app-border-soft)] px-3">
        <span className="flex items-center gap-2 font-medium">
          <RobotOutlined className="text-[var(--app-primary)]" />
          {messages.chat.title}
        </span>
        <div className="flex items-center gap-1">
          {canExpand && (
            <Tooltip title={expanded ? messages.chat.dock : messages.chat.expand}>
              <Button
                type="text"
                size="small"
                icon={expanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                aria-label={expanded ? messages.chat.dock : messages.chat.expand}
                onClick={expanded ? onDock : onExpand}
              />
            </Tooltip>
          )}
          <Tooltip title={messages.chat.collapseHint}>
            <Button
              type="text"
              size="small"
              icon={<DoubleRightOutlined />}
              iconPlacement="end"
              aria-label={messages.chat.collapseHint}
              onClick={onClose}
            >
              {messages.chat.collapse}
            </Button>
          </Tooltip>
        </div>
      </div>

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
