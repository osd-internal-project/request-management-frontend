/**
 * อีเมลงานขาย — mailbox + App ของ Microsoft Graph ต่อบริษัท (`admin.integration.manage`)
 *
 * Database: mail_settings
 * Services: core-service — `/admin/mail-settings`, `/admin/mail-settings/test`
 *
 * `client_secret` ส่งเข้าอย่างเดียว — คำตอบบอกแค่ `client_secret_set`
 */

import { adminApi, type ClientResult } from "../client";

export type MailMode = "off" | "mock" | "graph";

export interface MailSettings {
  /** company = ตั้งบนหน้านี้แล้ว · env = ยังใช้ MAIL_* ของ server */
  source: "company" | "env";
  mode: MailMode;
  mailbox: string;
  sender_name: string;
  tenant_id: string;
  client_id: string;
  client_secret_set: boolean;
  problem: string | null;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
  updated_at: string | null;
}

export interface MailSettingsPayload {
  mode: MailMode;
  mailbox?: string;
  sender_name?: string;
  tenant_id?: string;
  client_id?: string;
  /** ว่าง/ไม่ส่ง = ใช้ secret เดิม */
  client_secret?: string;
}

export interface MailTestResult {
  ok: boolean;
  mode: MailMode;
  mailbox: string;
  to: string;
  error: string | null;
}

export async function getMailSettings(): Promise<ClientResult<MailSettings>> {
  return adminApi<MailSettings>("mail-settings");
}

export async function saveMailSettings(
  payload: MailSettingsPayload,
): Promise<ClientResult<MailSettings>> {
  return adminApi<MailSettings>("mail-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function testMailSettings(
  payload: MailSettingsPayload & { to?: string },
): Promise<ClientResult<MailTestResult>> {
  return adminApi<MailTestResult>("mail-settings/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
