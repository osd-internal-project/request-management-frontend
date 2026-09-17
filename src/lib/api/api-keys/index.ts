/**
 * กุญแจ API ของช่องทางภายนอก — `admin.integration.manage` (14 ก.ย. 2569)
 *
 * Database: api_keys
 * Services: core-service — `/admin/api-keys/*`
 *
 * ผ่าน BFF (`adminApi`) ไม่ใช่ `core.ts` เพราะทุกตัวยิงจากการคลิกบนหน้าจอ
 * ค่าเต็มของกุญแจอยู่ในคำตอบของ `issueApiKey` **ครั้งเดียว** ไม่มี endpoint
 * ไหนอ่านกลับได้ — ห้ามเก็บไว้ที่ไหนนอกจากแสดงให้คนออกกุญแจคัดลอก
 */

import { adminApi, type ClientResult } from "../client";

export interface ApiKeyRow {
  id: string;
  prefix: string;
  name: string;
  source_code: string | null;
  scopes: string[];
  status: "active" | "expired" | "revoked";
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  created_by: string | null;
}

/** คำตอบตอนออกกุญแจ — `key` คือค่าเต็มที่จะไม่ปรากฏอีก. */
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

/** สิทธิ์ที่ออกให้กุญแจได้ — มาจาก catalog ฝั่ง backend ไม่ใช่รายการเขียนมือ. */
export async function listApiKeyScopes(): Promise<ClientResult<ApiKeyScope[]>> {
  return adminApi<ApiKeyScope[]>("api-keys/scopes");
}

/** กุญแจของบริษัทที่กำลังทำงานอยู่ — ไม่มีค่ากุญแจในคำตอบ มีแต่ prefix. */
export async function listApiKeys(): Promise<ClientResult<ApiKeyRow[]>> {
  return adminApi<ApiKeyRow[]>("api-keys");
}

export async function issueApiKey(
  payload: IssueApiKeyPayload,
): Promise<ClientResult<IssuedApiKey>> {
  return adminApi<IssuedApiKey>("api-keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeApiKey(
  id: string,
): Promise<ClientResult<ApiKeyRow>> {
  return adminApi<ApiKeyRow>(`api-keys/${id}/revoke`, { method: "POST" });
}

/** Grouped for `import apiKeys from …` at call sites. */
const apiKeys = {
  listApiKeyScopes,
  listApiKeys,
  issueApiKey,
  revokeApiKey,
};

export default apiKeys;
