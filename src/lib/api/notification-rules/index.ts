/**
 * Notification rules (CD-53) — core-service, `admin.notification.manage`.
 */
import { apiGet, type ApiResult } from "../core";
import type { NotificationRuleRow } from "./types";

export type { NotificationRuleRow, RuleParams } from "./types";

export function getNotificationRules(): Promise<
  ApiResult<NotificationRuleRow[]>
> {
  return apiGet("/admin/notification-rules");
}
