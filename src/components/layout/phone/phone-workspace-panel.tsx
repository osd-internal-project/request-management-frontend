"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spin, Tooltip } from "antd";
import { ArrowLeftOutlined, PhoneOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.phone;

const WORKSPACE_SCRIPT = "https://dcall-v2.osd.co.th/embed/workspace.js";

interface WorkspaceHandle {
  destroy: () => void;
}

interface WorkspaceApi {
  mount: (options: {
    workspace: number;
    ticket: string;
    target: HTMLElement;
    lang: "th" | "en";
    onEvent: (name: string, data: Record<string, unknown>) => void;
  }) => WorkspaceHandle;
}

declare global {
  interface Window {
    DcallWorkspace?: WorkspaceApi;
  }
}

type Ticket =
  | { enabled: false; reason?: string }
  | { enabled: true; workspace: number; ticket: string; expires_at: string | null };

type PanelState =
  | { kind: "idle" | "loading" | "mounted" }
  | { kind: "off" | "error"; message: string };

let scriptLoad: Promise<void> | null = null;

/** Loads Dcall's embed script once per page; a failed load may be retried. */
function loadWorkspaceScript(): Promise<void> {
  if (window.DcallWorkspace) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WORKSPACE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      script.remove();
      reject(new Error("D-Callcenter script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/**
 * The phone workspace over the whole content area. Rendered once by the shell and
 * only resized by CSS: an iframe reloads (and drops the call) whenever its node is
 * unmounted or moved, so closing collapses it instead of removing it.
 */
export function PhoneWorkspacePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  // Each session is one ticket and one mount; the ticket works once, for 2 minutes.
  const [session, setSession] = useState(0);
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  function startSession() {
    setSession((n) => n + 1);
    setState({ kind: "loading" });
  }

  // Mounting at first open, not at page load: the last place opened holds the phone.
  if (open && session === 0) startSession();

  useEffect(() => {
    if (session === 0) return;
    let cancelled = false;
    let workspace: WorkspaceHandle | null = null;

    void (async () => {
      try {
        await loadWorkspaceScript();
      } catch {
        if (!cancelled) setState({ kind: "error", message: m.failed });
        return;
      }
      const result = await appApi<Ticket>("softphone/workspace-ticket", {
        method: "POST",
      });
      if (cancelled) return;
      if (!result.ok) {
        setState({ kind: "error", message: result.message });
        return;
      }
      if (!result.data.enabled) {
        setState({
          kind: "off",
          message: result.data.reason === "NO_EMAIL" ? m.noEmail : m.notConfigured,
        });
        return;
      }
      const target = host.current;
      const api = window.DcallWorkspace;
      if (!target || !api) {
        setState({ kind: "error", message: m.failed });
        return;
      }
      workspace = api.mount({
        workspace: result.data.workspace,
        ticket: result.data.ticket,
        target,
        lang: "th",
        onEvent: (name, data) => {
          if (name === "signed-out") startSession();
          if (name === "error") {
            setState({
              kind: "error",
              message: typeof data.message === "string" ? data.message : m.failed,
            });
          }
        },
      });
      setState({ kind: "mounted" });
    })();

    return () => {
      cancelled = true;
      workspace?.destroy();
    };
  }, [session]);

  const showsFrame = state.kind === "mounted" || state.kind === "error";

  return (
    <aside
      aria-label={m.title}
      aria-hidden={!open}
      inert={!open}
      className={
        open
          ? "absolute inset-0 z-10 flex flex-col bg-white"
          : "absolute h-0 w-0 overflow-hidden"
      }
    >
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--app-border-soft)] px-3">
        <Tooltip title={m.collapseHint}>
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            aria-label={m.collapseHint}
            onClick={onClose}
          >
            {m.collapse}
          </Button>
        </Tooltip>
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <PhoneOutlined className="text-[var(--app-primary)]" />
          <span className="truncate">{m.title}</span>
        </span>
      </div>

      {state.kind === "error" && (
        <Alert
          type="error"
          showIcon
          banner
          title={m.failed}
          description={state.message === m.failed ? undefined : state.message}
          action={
            <Button size="small" onClick={startSession}>
              {m.retry}
            </Button>
          }
        />
      )}

      {(state.kind === "idle" || state.kind === "loading") && (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--app-bg)]">
          <Spin description={m.loading} />
        </div>
      )}

      {state.kind === "off" && (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--app-bg)] p-4 text-center text-[var(--app-text-muted)]">
          {state.message}
        </div>
      )}

      {/* Always in the tree so the iframe never moves; hidden until it is mounted. */}
      <div ref={host} className={showsFrame ? "min-h-0 flex-1" : "hidden"} />
    </aside>
  );
}
