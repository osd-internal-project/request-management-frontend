/**
 * Notification log (CD-55) — ส่งถึงใคร เมื่อไร ช่องทางใด อ่านแล้วหรือยัง.
 *
 * Services: core-service · permission `audit.read` · read-only
 */
import { apiGet, type ApiResult } from "../core";
import type { Paginated } from "../types";

export interface NotificationLogRow {
  id: string;
  created_at: string;
  recipient: {
    id: string;
    display_name: string;
    username: string;
    email: string | null;
  };
  event_type: string;
  title: string;
  body: string;
  resource_type: string | null;
  resource_id: string | null;
  /** The first time it was read; null = never. */
  read_at: string | null;
  /** null on a read row = read before the system recorded how. */
  read_via: "opened" | "mark_all" | null;
  deliveries: {
    channel: string;
    target: string;
    status: string;
    error: string | null;
    sent_at: string | null;
    created_at: string;
  }[];
}

export const NOTIFICATION_LOG_FILTERS = [
  "q",
  "event_type",
  "read",
  "resource_type",
  "resource_id",
  "from",
  "to",
] as const;

export type NotificationLogQuery = Partial<
  Record<(typeof NOTIFICATION_LOG_FILTERS)[number], string>
> & { page?: number };

export function getNotificationLog(
  query: NotificationLogQuery,
): Promise<ApiResult<Paginated<NotificationLogRow>>> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("page_size", "50");
  for (const key of NOTIFICATION_LOG_FILTERS) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  return apiGet(`/notifications/log?${params.toString()}`);
}
