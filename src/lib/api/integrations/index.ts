/**
 * API keys ของช่องทางภายนอก (AUTH-06, 14 ก.ย. 2569)
 *
 * Services: core-service — `/admin/api-keys/*`
 *
 * หนึ่งกุญแจต่อหนึ่งช่องทาง: เว็บฟอร์ม, LINE OA, งานอีเวนต์ แต่ละอันถือกุญแจ
 * ของตัวเองที่เพิกถอนได้โดยช่องทางอื่นไม่กระทบ.
 *
 * **ค่าเต็มของกุญแจมาจาก `issueApiKey` ครั้งเดียว** — ไม่มีฟังก์ชันอ่านกลับ
 * เพราะ backend เก็บแค่ sha256. หน้าจอที่เรียกมันต้องแสดงให้คัดลอกทันที และ
 * ต้องไม่เก็บไว้ใน state ข้ามหน้า.
 */

import { adminApi, type ClientResult } from "../client";

export type ApiKeyStatus = "active" | "expired" | "revoked";

export interface ApiKeyRow {
  id: string;
  /** ตัวขึ้นต้นของกุญแจ — อ้างถึงใบนี้ได้โดยไม่ต้องเอ่ยตัวเต็ม */
  prefix: string;
  name: string;
  source_code: string | null;
  scopes: string[];
  status: ApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  created_by: string | null;
}

/** แถวเดียวกัน บวกค่าเต็มที่จะไม่ถูกส่งกลับมาอีกตลอดอายุของกุญแจใบนี้. */
export interface IssuedApiKey extends ApiKeyRow {
  key: string;
}

export interface ApiKeyScope {
  code: string;
}

export interface IssueApiKeyPayload {
  name: string;
  source_code: string;
  scopes: string[];
  expires_in_days?: number;
}

/** กุญแจของบริษัทที่กำลังทำงานอยู่ — ไม่มีค่าเต็มในคำตอบ. */
export async function listApiKeys(): Promise<ClientResult<ApiKeyRow[]>> {
  return adminApi<ApiKeyRow[]>("api-keys");
}

/** สิทธิ์ที่ติ๊กให้กุญแจได้ — มาจาก catalog ฝั่ง backend ไม่ใช่รายการในไฟล์นี้. */
export async function listApiKeyScopes(): Promise<
  ClientResult<ApiKeyScope[]>
> {
  return adminApi<ApiKeyScope[]>("api-keys/scopes");
}

export async function issueApiKey(
  payload: IssueApiKeyPayload,
): Promise<ClientResult<IssuedApiKey>> {
  return adminApi<IssuedApiKey>("api-keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** เพิกถอน — มีผลกับคำขอถัดไปทันที และย้อนกลับไม่ได้. */
export async function revokeApiKey(
  id: string,
): Promise<ClientResult<ApiKeyRow>> {
  return adminApi<ApiKeyRow>(`api-keys/${id}/revoke`, { method: "POST" });
}

const integrationsApi = {
  listApiKeys,
  listApiKeyScopes,
  issueApiKey,
  revokeApiKey,
};

export default integrationsApi;
