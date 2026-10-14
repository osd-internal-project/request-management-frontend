import type { ChatWidgetConfig } from "@/components/layout/chat/librechat-widget";
import { apiGet } from "@/lib/api/core";

interface RuntimeWidgets {
  widgets: {
    id: string;
    name: string;
    http_url: string | null;
    https_url: string | null;
    public_id: string | null;
  }[];
  default_id: string | null;
}

/**
 * Server only: the chats this user may open (org-wide plus their groups') and
 * the one to start on. Null when none is set up or the read failed — the
 * panel then says the assistant is not configured rather than breaking the page.
 */
export async function readChatWidgetConfig(): Promise<ChatWidgetConfig | null> {
  const result = await apiGet<RuntimeWidgets>("/chat-widget/runtime");
  if (!result.ok) return null;

  const widgets = result.data.widgets.flatMap((widget) =>
    widget.public_id
      ? [
          {
            id: widget.id,
            name: widget.name,
            httpUrl: widget.http_url,
            httpsUrl: widget.https_url,
            publicId: widget.public_id,
          },
        ]
      : [],
  );
  if (!widgets.length) return null;
  return { widgets, defaultId: result.data.default_id };
}
