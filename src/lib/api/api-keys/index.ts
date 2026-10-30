/**
 * กุญแจ API ของช่องทางภายนอก — `admin.integration.manage` (14 ก.ย. 2569)
 *
 * Database: api_keys
 * Services: core-service — `/admin/api-keys/*`
 *
 * ผ่าน BFF (`adminApi`) ไม่ใช่ `core.ts` เพราะทุกตัวยิงจากการคลิกบนหน้าจอ
 * ค่าเต็มของกุญแจอ่านได้ตอนออก / ออกใหม่ และจาก `revealApiKey` (ลง audit ทุกครั้ง)
 * — ห้ามเก็บไว้ที่ไหนนอกจาก state ของช่องที่แสดงมัน
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
  /** ระบบภายนอกเจ้าของกุญแจ — null = กุญแจก่อน 22 ต.ค. 2569 ที่ยังไม่ backfill. */
  integration_id: string | null;
}

/** ตัวอย่างการเรียกหนึ่ง route — สร้างจาก OpenAPI ฝั่ง backend ไม่ใช่เขียนมือ. */
export interface ApiExample {
  operationId: string;
  tag: string;
  summary: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** ไม่มี `/api/v1` นำหน้า เช่น `/agent-records/{id}` */
  path: string;
  scopes: string[];
  /** route ต้องมี `X-Acting-User` */
  actingUser: boolean;
  query: Record<string, unknown>;
  body: unknown;
}

/** คำตอบตอนออกกุญแจ / ออกใหม่ — `key` คือค่าเต็ม. */
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
  /** ไม่ส่ง = backend สร้างระบบภายนอกให้กุญแจใบนี้เอง */
  integration_id?: string;
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

/** แทนที่สิทธิ์ทั้งชุดของกุญแจที่ออกไปแล้ว — มีผลกับคำขอถัดไปทันที. */
export async function updateApiKeyScopes(
  id: string,
  scopes: string[],
): Promise<ClientResult<ApiKeyRow>> {
  return adminApi<ApiKeyRow>(`api-keys/${id}/scopes`, {
    method: "PATCH",
    body: JSON.stringify({ scopes }),
  });
}

export async function revokeApiKey(
  id: string,
): Promise<ClientResult<ApiKeyRow>> {
  return adminApi<ApiKeyRow>(`api-keys/${id}/revoke`, { method: "POST" });
}

/** ค่าเต็มของกุญแจ — กุญแจที่ออกก่อน 26 ต.ค. 2569 ได้ 422 (ต้องออกใหม่). */
export async function revealApiKey(
  id: string,
): Promise<ClientResult<{ key: string }>> {
  return adminApi<{ key: string }>(`api-keys/${id}/secret`);
}

/** ออกใบใหม่สิทธิ์เดิม แล้วเพิกถอนใบเดิมทันที. */
export async function rotateApiKey(
  id: string,
): Promise<ClientResult<IssuedApiKey>> {
  return adminApi<IssuedApiKey>(`api-keys/${id}/rotate`, { method: "POST" });
}

/** route ที่กุญแจใบนี้เรียกได้ครบทุก scope — กุญแจของบริษัทอื่นได้ 404. */
export async function getApiKeyExamples(
  id: string,
): Promise<ClientResult<ApiExample[]>> {
  return adminApi<ApiExample[]>(`api-keys/${id}/examples`);
}

/** Grouped for `import apiKeys from …` at call sites. */
const apiKeys = {
  listApiKeyScopes,
  listApiKeys,
  issueApiKey,
  updateApiKeyScopes,
  revokeApiKey,
  revealApiKey,
  rotateApiKey,
  getApiKeyExamples,
};

export default apiKeys;
