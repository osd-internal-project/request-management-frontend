/**
 * Notification templates (CD-54) — core-service, `admin.notification.manage`.
 */
import { apiGet, type ApiResult } from "../core";
import type { NotificationTemplateRow } from "./types";

export type { NotificationTemplateRow } from "./types";

export function getNotificationTemplates(): Promise<
  ApiResult<NotificationTemplateRow[]>
> {
  return apiGet("/admin/notification-templates");
}
