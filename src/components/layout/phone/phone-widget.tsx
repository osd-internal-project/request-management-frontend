"use client";

import { useEffect, useState } from "react";
import { appApi } from "@/lib/api/client";

const WIDGET_SCRIPT = "https://dcall-v2.osd.co.th/widget/softphone.js";

interface SoftphoneHandle {
  destroy: () => void;
}

interface SoftphoneApi {
  mount: (options: {
    widget: number;
    ticket: string;
    lang: "th" | "en";
    onEvent: (name: string, data: Record<string, unknown>) => void;
  }) => SoftphoneHandle;
}

declare global {
  interface Window {
    DcallSoftphone?: SoftphoneApi;
  }
}

type Ticket =
  | { enabled: false; reason?: string }
  | { enabled: true; widget: number; ticket: string; expires_at: string | null };

let scriptLoad: Promise<void> | null = null;

/** Loads Dcall's widget script once per page; a failed load may be retried. */
function loadWidgetScript(): Promise<void> {
  if (window.DcallSoftphone) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      script.remove();
      reject(new Error("D-Callcenter widget script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/**
 * D-Callcenter's floating softphone card. The vendor draws and positions it
 * (fixed iframe on `body`); this only fetches the one-time ticket and mounts it.
 */
export function PhoneWidget() {
  // Each session is one ticket and one mount; the ticket works once, for 2 minutes.
  const [session, setSession] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let phone: SoftphoneHandle | null = null;

    void (async () => {
      try {
        await loadWidgetScript();
      } catch (error) {
        console.warn("[phone-widget]", error);
        return;
      }
      const result = await appApi<Ticket>("softphone/widget-ticket", {
        method: "POST",
      });
      if (cancelled) return;
      if (!result.ok) {
        console.warn("[phone-widget] ticket:", result.message);
        return;
      }
      const api = window.DcallSoftphone;
      if (!result.data.enabled || !api) {
        if (result.data.enabled === false && result.data.reason) {
          console.warn("[phone-widget] off:", result.data.reason);
        }
        return;
      }
      phone = api.mount({
        widget: result.data.widget,
        ticket: result.data.ticket,
        lang: "th",
        onEvent: (name, data) => {
          if (name === "signed-out") setSession((n) => n + 1);
          if (name === "error") console.warn("[phone-widget]", data.message);
        },
      });
    })();

    return () => {
      cancelled = true;
      phone?.destroy();
    };
  }, [session]);

  return null;
}
