"use client";

import { useEffect, useId, useRef } from "react";
import {
  attachChatWidget,
  clearChatContext,
  detachChatWidget,
} from "@/components/layout/chat/chat-context";

export interface ChatWidgetConfig {
  /** Origin of the LibreChat host, no path. */
  url: string;
  publicId: string;
}

const SSO_LOGOUT_EVENT = "librechat-widget:sso-logout";
const AVAILABLE_EVENT = "librechat-widget:available";
const STORAGE_PREFIX = "librechat-widget:";

/** Long enough for an open widget's iframe to receive the logout message. */
const LOGOUT_GRACE_MS = 200;

/** v1.js keeps its token in the host's localStorage; clear it even with the panel closed. */
function clearStoredWidgetTokens() {
  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Blocked storage — the script could not have stored anything either.
  }
}

/** The instance v1.js just registered — read while its `available` event is dispatching. */
function announcedWidget(publicId: string): unknown {
  const widgets: unknown = Reflect.get(window, "LibreChatWidgets");
  if (typeof widgets !== "object" || widgets === null) return null;
  return Reflect.get(widgets, publicId);
}

/** Cancels an instance's bootstrap and removes its iframe. */
function destroyWidget(widget: unknown) {
  if (typeof widget !== "object" || widget === null) return;
  const destroy: unknown = Reflect.get(widget, "destroy");
  if (typeof destroy === "function") Reflect.apply(destroy, widget, []);
}

/**
 * Tells every mounted widget to revoke its session, then resolves once the
 * message has had time to land. Await it before navigating to logout.
 */
export function signOutChatWidget() {
  clearChatContext();
  window.dispatchEvent(new Event(SSO_LOGOUT_EVENT));
  clearStoredWidgetTokens();
  return new Promise<void>((resolve) => setTimeout(resolve, LOGOUT_GRACE_MS));
}

/**
 * The aiyara LibreChat widget in inline mode, following the vendor's React
 * snippet. The script appends its iframe inside our container.
 */
export function LibreChatWidget({ widget }: { widget: ChatWidgetConfig }) {
  // ChatPanel can be mounted twice (split pane + drawer), so the target id
  // must be unique; useId's punctuation is not a valid CSS selector.
  const targetId = `librechat-widget-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instanceSelector = `[data-librechat-widget-instance="${widget.publicId}"]`;

    const script = document.createElement("script");
    script.src = `${widget.url}/widget/v1.js`;
    script.dataset.publicId = widget.publicId;
    script.dataset.mode = "inline";
    script.dataset.target = `#${targetId}`;
    script.dataset.height = "100%";
    script.async = true;
    document.body.appendChild(script);

    const onLogout = () => {
      container.querySelectorAll<HTMLIFrameElement>(instanceSelector).forEach((frame) => {
        frame.contentWindow?.postMessage(
          { type: "librechat-widget:logout", publicId: widget.publicId },
          widget.url,
        );
      });
    };
    window.addEventListener(SSO_LOGOUT_EVENT, onLogout);

    // A removed script still runs once fetched (StrictMode remounts at once), so each
    // mount keeps its own instance and destroys one whose mount is already gone.
    let instance: unknown = null;
    let retired = false;
    const stopListening = () =>
      document.removeEventListener(AVAILABLE_EVENT, onAvailable);
    function onAvailable() {
      if (document.currentScript !== script) return;
      stopListening();
      const announced = announcedWidget(widget.publicId);
      if (retired) {
        destroyWidget(announced);
        return;
      }
      instance = announced;
      attachChatWidget(announced);
    }
    document.addEventListener(AVAILABLE_EVENT, onAvailable);
    script.addEventListener("error", stopListening);

    return () => {
      retired = true;
      if (instance) {
        detachChatWidget(instance);
        destroyWidget(instance);
      }
      window.removeEventListener(SSO_LOGOUT_EVENT, onLogout);
      script.remove();
      container.querySelectorAll(instanceSelector).forEach((frame) => frame.remove());
    };
  }, [widget.url, widget.publicId, targetId]);

  return <div id={targetId} ref={containerRef} className="h-full w-full" />;
}
