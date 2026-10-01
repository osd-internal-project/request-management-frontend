"use client";

import { useState } from "react";

export type ChatDockMode = "closed" | "docked" | "expanded";

/** Only the docked width is remembered — see `readChatWidth`. */
const CHAT_WIDTH_KEY = "chat-panel-width";
const CHAT_WIDTH_DEFAULT = "33%";
const CHAT_MIN_WIDTH = 320;
/** A docked panel never takes more than this share of the split. */
const DOCKED_MAX_SHARE = 0.6;
/** Releasing the dragger with less content than this share snaps to `expanded`. */
const SNAP_CONTENT_SHARE = 0.3;

/**
 * Whether the panel is open is deliberately *not* stored: the server renders
 * it closed, so a stored "open" would break hydration.
 */
function readChatWidth() {
  try {
    const stored = Number(window.localStorage.getItem(CHAT_WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

function writeChatWidth(width: number) {
  try {
    window.localStorage.setItem(CHAT_WIDTH_KEY, String(Math.round(width)));
  } catch {
    // Private mode or blocked storage — the panel still works, it just forgets.
  }
}

function contentShare([content = 0, chat = 0]: number[]) {
  const total = content + chat;
  return total > 0 ? content / total : 1;
}

/**
 * Every condition of the chat dock: its mode, its remembered width, and the
 * drag-to-snap rule between `docked` and `expanded`. The shell only renders.
 */
export function useChatDock() {
  const [mode, setMode] = useState<ChatDockMode>("closed");
  // The widget mounts on first open and then stays, so closing keeps the conversation.
  const [hasOpened, setHasOpened] = useState(false);
  const [dockedWidth, setDockedWidth] = useState<number | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [isSnapPreview, setIsSnapPreview] = useState(false);

  const isOpen = mode !== "closed";

  function open() {
    // Read on demand, not during render: the server cannot see localStorage.
    if (!hasOpened) setDockedWidth(readChatWidth());
    setHasOpened(true);
    setMode("docked");
  }

  function close() {
    setMode("closed");
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function onResize(sizes: number[]) {
    setDragWidth(sizes[1] ?? null);
    setIsSnapPreview(contentShare(sizes) < SNAP_CONTENT_SHARE);
  }

  function onResizeEnd(sizes: number[]) {
    setDragWidth(null);
    setIsSnapPreview(false);
    if (contentShare(sizes) < SNAP_CONTENT_SHARE) {
      setMode("expanded");
      return;
    }

    const [content = 0, chat = 0] = sizes;
    const width = Math.min(chat, (content + chat) * DOCKED_MAX_SHARE);
    setDockedWidth(width);
    writeChatWidth(width);
    setMode("docked");
  }

  function chatPanelSize(): number | string {
    if (mode === "closed") return 0;
    if (dragWidth !== null) return dragWidth;
    if (mode === "expanded") return "100%";
    return dockedWidth ?? CHAT_WIDTH_DEFAULT;
  }

  return {
    mode,
    isOpen,
    hasOpened,
    isSnapPreview,
    open,
    close,
    toggle,
    expand: () => setMode("expanded"),
    dock: () => setMode("docked"),
    chatPanel: {
      size: chatPanelSize(),
      min: isOpen ? CHAT_MIN_WIDTH : undefined,
      resizable: isOpen,
    },
    splitter: {
      onResize,
      onResizeEnd,
      onDraggerDoubleClick: () => {
        if (isOpen) setMode(mode === "expanded" ? "docked" : "expanded");
      },
    },
  };
}
