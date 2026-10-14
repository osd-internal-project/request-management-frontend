"use client";

import { useCallback, useSyncExternalStore } from "react";
import type {
  ChatWidgetConfig,
  ChatWidgetOption,
} from "@/components/layout/chat/librechat-widget";

const STORAGE_KEY = "chat-widget:selected";
const CHANGE_EVENT = "chat-widget:selected";

// Where the choice lives when storage is blocked; it then lasts until reload.
let memoryChoice: string | null = null;

function readChoice(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryChoice;
  } catch {
    return memoryChoice;
  }
}

function subscribe(onChange: () => void) {
  // The panel can be mounted twice (split pane + drawer); both follow one choice.
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The chat the panel shows: the one this browser picked last if the user may
 * still open it, else the default the server chose, else the first.
 */
export function useChatWidgetChoice(
  config: ChatWidgetConfig | null,
): [ChatWidgetOption | null, (id: string) => void] {
  const stored = useSyncExternalStore(subscribe, readChoice, () => null);
  const widgets = config?.widgets ?? [];
  const chosen =
    widgets.find((widget) => widget.id === stored) ??
    widgets.find((widget) => widget.id === config?.defaultId) ??
    widgets[0] ??
    null;

  const choose = useCallback((id: string) => {
    memoryChoice = id;
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Blocked storage — `memoryChoice` carries it for this page's life.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [chosen, choose];
}
