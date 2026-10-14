import type { ChatWidgetConfig } from "@/components/layout/chat/librechat-widget";
import { apiGet } from "@/lib/api/core";
import {
  LIBRECHAT_WIDGET_PUBLIC_ID,
  LIBRECHAT_WIDGET_URL,
} from "@/lib/backend";

interface RuntimeWidget {
  http_url: string | null;
  https_url: string | null;
  public_id: string | null;
}

/**
 * Server only: the company's widget from the chat-widget settings, each empty
 * slot filled from env (`LIBRECHAT_WIDGET_URL` lands in the slot its scheme
 * matches). A failed read falls back to env alone rather than breaking the page.
 * Null when there is no public id or no URL at all.
 */
export async function readChatWidgetConfig(): Promise<ChatWidgetConfig | null> {
  const result = await apiGet<RuntimeWidget>("/chat-widget/runtime");
  const saved = result.ok ? result.data : null;

  const envUrl = LIBRECHAT_WIDGET_URL.trim() || null;
  const envIsHttps = envUrl?.startsWith("https:") ?? false;
  const httpUrl = saved?.http_url ?? (envIsHttps ? null : envUrl);
  const httpsUrl = saved?.https_url ?? (envIsHttps ? envUrl : null);
  const publicId = saved?.public_id ?? (LIBRECHAT_WIDGET_PUBLIC_ID || null);

  if (!publicId || (!httpUrl && !httpsUrl)) return null;
  return { httpUrl, httpsUrl, publicId };
}
