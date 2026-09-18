/**
 * Notifications API (SUP-03) — core-service `/notifications`.
 *
 * Server-side reads only; the bell and the page mark rows read through
 * `appApi` from the browser.
 */

import { apiGet, type ApiResult } from "../core";
import type {
  AppNotification,
  NotificationPreferences,
  Paginated,
} from "../types";

/** My notifications in the active company, newest first. */
export async function getNotifications(options?: {
  unread?: boolean;
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<AppNotification>>> {
  const params = new URLSearchParams();
  if (options?.unread) params.set("unread", "true");
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 20));
  return apiGet(`/notifications?${params.toString()}`);
}

export async function getUnreadCount(): Promise<ApiResult<{ count: number }>> {
  return apiGet("/notifications/unread-count");
}

export async function getNotificationPreferences(): Promise<
  ApiResult<NotificationPreferences>
> {
  return apiGet("/notifications/preferences");
}

/** Grouped for `import notificationsApi from …` at call sites. */
const notificationsApi = {
  getNotifications,
  getUnreadCount,
  getNotificationPreferences,
};

export default notificationsApi;
