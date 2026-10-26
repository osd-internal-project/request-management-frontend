/**
 * Webhook ขาออก — `admin.integration.manage` (G-07)
 *
 * Database: webhook_subscriptions, webhook_deliveries
 * Services: core-service — `/admin/webhooks/*`
 *
 * `secret` อยู่ในคำตอบของ `createWebhook` / `rotateWebhookSecret` และ
 * `revealWebhookSecret` (ลง audit ทุกครั้ง) — ห้ามเก็บไว้นอก state ของช่องที่แสดงมัน
 */

import { adminApi, type ClientResult } from "../client";

export interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  created_by: string;
  integration_id: string | null;
}

export interface WebhookWithSecret extends WebhookRow {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  event_id: string;
  event: string;
  status: "pending" | "sending" | "sent" | "dead";
  attempts: number;
  last_status_code: number | null;
  last_error: string | null;
  next_attempt_at: string;
  sent_at: string | null;
  created_at: string;
}

export interface WebhookPayload {
  name: string;
  url: string;
  events: string[];
  integration_id?: string;
}

export async function listWebhookEvents(): Promise<
  ClientResult<{ code: string }[]>
> {
  return adminApi<{ code: string }[]>("webhooks/events");
}

export async function listWebhooks(): Promise<ClientResult<WebhookRow[]>> {
  return adminApi<WebhookRow[]>("webhooks");
}

export async function createWebhook(
  payload: WebhookPayload,
): Promise<ClientResult<WebhookWithSecret>> {
  return adminApi<WebhookWithSecret>("webhooks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWebhook(
  id: string,
  payload: Partial<WebhookPayload> & { active?: boolean },
): Promise<ClientResult<WebhookRow>> {
  return adminApi<WebhookRow>(`webhooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function rotateWebhookSecret(
  id: string,
): Promise<ClientResult<WebhookWithSecret>> {
  return adminApi<WebhookWithSecret>(`webhooks/${id}/rotate-secret`, {
    method: "POST",
  });
}

/** secret ปัจจุบัน — ลง audit ทุกครั้งที่ดู. */
export async function revealWebhookSecret(
  id: string,
): Promise<ClientResult<{ secret: string }>> {
  return adminApi<{ secret: string }>(`webhooks/${id}/secret`);
}

/** ส่งการแจ้งเดิมซ้ำด้วย `X-Webhook-Id` เดิม ในรอบถัดไปของ worker. */
export async function redeliverWebhook(
  id: string,
  deliveryId: string,
): Promise<ClientResult<{ queued: true }>> {
  return adminApi<{ queued: true }>(
    `webhooks/${id}/deliveries/${deliveryId}/redeliver`,
    { method: "POST" },
  );
}

export async function listWebhookDeliveries(
  id: string,
): Promise<ClientResult<WebhookDelivery[]>> {
  return adminApi<WebhookDelivery[]>(`webhooks/${id}/deliveries`);
}

export async function testWebhook(
  id: string,
): Promise<ClientResult<{ queued: true }>> {
  return adminApi<{ queued: true }>(`webhooks/${id}/test`, { method: "POST" });
}

const webhooks = {
  listWebhookEvents,
  listWebhooks,
  createWebhook,
  updateWebhook,
  rotateWebhookSecret,
  revealWebhookSecret,
  redeliverWebhook,
  listWebhookDeliveries,
  testWebhook,
};

export default webhooks;
