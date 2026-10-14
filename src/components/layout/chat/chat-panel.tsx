"use client";

import { Button, Select, Tooltip } from "antd";
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
import { useChatWidgetChoice } from "@/components/layout/chat/use-chat-widget-choice";
import { messages } from "@/lib/messages";

/**
 * The frame around the AI chat widget: title bar plus widget. How wide it is,
 * and whether it is a split pane or a drawer, is the shell's decision.
 * `widget` is null when the company has no chat this user may open; with two
 * or more, the title becomes a picker.
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
  const [chosen, choose] = useChatWidgetChoice(widget);
  const options = widget?.widgets ?? [];

  return (
    <section className="flex h-full flex-col border-l border-[var(--app-border-soft)] bg-white">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--app-border-soft)] px-3">
        <span className="flex items-center gap-2 font-medium">
          <RobotOutlined className="text-[var(--app-primary)]" />
          {chosen && options.length > 1 ? (
            <Select
              size="small"
              variant="borderless"
              value={chosen.id}
              onChange={choose}
              popupMatchSelectWidth={false}
              aria-label={messages.chat.pick}
              options={options.map((option) => ({
                value: option.id,
                label: option.name,
              }))}
            />
          ) : (
            (chosen?.name ?? messages.chat.title)
          )}
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
        {chosen ? (
          // Keyed so switching chats remounts: a new script, a new iframe.
          <LibreChatWidget key={chosen.id} widget={chosen} />
        ) : (
          <p className="p-4 text-[var(--app-text-muted)]">
            {messages.chat.notConfigured}
          </p>
        )}
      </div>
    </section>
  );
}
