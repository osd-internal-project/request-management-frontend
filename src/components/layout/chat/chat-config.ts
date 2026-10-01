import type { ChatWidgetConfig } from "@/components/layout/chat/librechat-widget";
import {
  LIBRECHAT_WIDGET_PUBLIC_ID,
  LIBRECHAT_WIDGET_URL,
} from "@/lib/backend";

/** Server only: the widget config from env, or null when either value is unset. */
export function readChatWidgetConfig(): ChatWidgetConfig | null {
  if (!LIBRECHAT_WIDGET_URL || !LIBRECHAT_WIDGET_PUBLIC_ID) return null;
  return { url: LIBRECHAT_WIDGET_URL, publicId: LIBRECHAT_WIDGET_PUBLIC_ID };
}
