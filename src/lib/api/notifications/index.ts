/**
 * Notifications API
 * 
 * Database: notifications
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";

export interface Notification {
  id: string;
  [key: string]: unknown;
}

/** Get notifications */
export async function getNotifications(): Promise<
  ApiResult<Notification[]>
> {
  return apiGet<Notification[]>("/notifications");
}

/** Get a single notification by ID */
export async function getNotification(
  notificationId: string,
): Promise<ApiResult<Notification>> {
  return apiGet<Notification>(`/notifications/${notificationId}`);
}

/** Grouped for `import notificationsApi from …` at call sites. */
const notificationsApi = {
  getNotifications,
  getNotification,
};

export default notificationsApi;
