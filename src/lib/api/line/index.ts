/**
 * LINE — each user links their own LINE to the active company's OA
 *
 * Database: line_settings, user_line_accounts
 * Services: core-service — `/admin/line-settings` (`admin.integration.manage`),
 *           `/notifications/line`, `/notifications/line/start`
 *
 * `login_channel_secret` ส่งเข้าอย่างเดียว — คำตอบบอกแค่ `login_channel_secret_set`
 */

import { adminApi, appApi, type ClientResult } from "../client";

export interface LineSettings {
  login_channel_id: string;
  login_channel_secret_set: boolean;
  oa_basic_id: string;
  /** ค่าที่ต้องใส่ใน LINE Developers */
  callback_url: string;
  updated_at: string | null;
}

export interface LineSettingsPayload {
  login_channel_id: string;
  /** ว่าง/ไม่ส่ง = ใช้ secret เดิม */
  login_channel_secret?: string;
  oa_basic_id: string;
}

export interface LineLinkStatus {
  configured: boolean;
  oa_basic_id: string;
  linked: {
    display_name: string;
    picture_url: string | null;
    is_friend: boolean;
    linked_at: string;
  } | null;
}

export async function getLineSettings(): Promise<ClientResult<LineSettings>> {
  return adminApi<LineSettings>("line-settings");
}

export async function saveLineSettings(
  payload: LineSettingsPayload,
): Promise<ClientResult<LineSettings>> {
  return adminApi<LineSettings>("line-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** The LINE Login URL to send the browser to. */
export async function startLineLink(): Promise<ClientResult<{ url: string }>> {
  return appApi<{ url: string }>("notifications/line/start", { method: "POST" });
}

export async function unlinkLine(): Promise<ClientResult<void>> {
  return appApi<void>("notifications/line", { method: "DELETE" });
}
