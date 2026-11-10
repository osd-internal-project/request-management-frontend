"use client";

import { Button, Tooltip } from "antd";
import { DoubleRightOutlined, PhoneOutlined } from "@ant-design/icons";
import { messages } from "@/lib/messages";

/**
 * The phone workspace beside the content. Rendered once by the shell and only
 * resized by CSS: an iframe reloads (and drops the call) whenever its node is
 * unmounted or moved, so closing collapses it instead of removing it.
 */
export function PhoneWorkspacePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label={messages.phone.title}
      aria-hidden={!open}
      inert={!open}
      className={
        open
          ? "flex w-[380px] shrink-0 flex-col border-l border-[var(--app-border-soft)] bg-white max-lg:fixed max-lg:inset-x-0 max-lg:top-[68px] max-lg:bottom-0 max-lg:z-[1000] max-lg:w-auto"
          : "flex w-0 shrink-0 flex-col overflow-hidden"
      }
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--app-border-soft)] px-3">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <PhoneOutlined className="text-[var(--app-primary)]" />
          <span className="truncate">{messages.phone.title}</span>
        </span>
        <Tooltip title={messages.phone.collapseHint}>
          <Button
            type="text"
            size="small"
            icon={<DoubleRightOutlined />}
            iconPlacement="end"
            aria-label={messages.phone.collapseHint}
            onClick={onClose}
          >
            {messages.phone.collapse}
          </Button>
        </Tooltip>
      </div>

      {/* The workspace iframe goes here; until its URL is configured the slot stays empty. */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--app-bg)] p-4 text-center text-[var(--app-text-muted)]">
        {messages.phone.notConfigured}
      </div>
    </aside>
  );
}
