/**
 * ระบบภายนอก — `admin.integration.manage` (22 ต.ค. 2569)
 *
 * Database: integrations, integration_calls
 * Services: core-service — `/admin/integrations/*`
 *
 * หนึ่งระบบถือกุญแจ API และ webhook ของตัวเอง (`integration_id` บนสองตารางนั้น)
 */

import { adminApi, type ClientResult } from "../client";
import type { Paginated } from "../types";

/** `app` = ในนามบริษัท, `delegated` = ในนามผู้ใช้ที่ login เอง (`X-User-Token`). */
export type IntegrationMode = "app" | "delegated";

export interface IntegrationRow {
  id: string;
  name: string;
  description: string | null;
  modes: IntegrationMode[];
  allow_acting_user: boolean;
  keycloak_client_ids: string[];
  active: boolean;
  api_key_count: number;
  webhook_count: number;
  created_at: string;
  created_by: string;
}

export interface IntegrationPayload {
  name: string;
  description?: string;
  modes: IntegrationMode[];
  allow_acting_user?: boolean;
  keycloak_client_ids?: string[];
}

/** ชุด scope สำเร็จรูปต่อ use case — ติ๊กให้ ไม่ใช่สิทธิ์ใหม่. */
export interface IntegrationPreset {
  code: string;
  name: string;
  modes: IntegrationMode[];
  scopes: string[];
}

export type CallMode = "app" | "user_token" | "acting_user" | "person";

export interface IntegrationCall {
  id: string;
  at: string;
  method: string;
  route: string;
  mode: CallMode;
  api_key_id: string | null;
  actor_user_id: string | null;
  status: number;
  duration_ms: number;
}

export async function listIntegrations(): Promise<ClientResult<IntegrationRow[]>> {
  return adminApi<IntegrationRow[]>("integrations");
}

export async function listIntegrationPresets(): Promise<
  ClientResult<IntegrationPreset[]>
> {
  return adminApi<IntegrationPreset[]>("integrations/presets");
}

export async function createIntegration(
  payload: IntegrationPayload,
): Promise<ClientResult<IntegrationRow>> {
  return adminApi<IntegrationRow>("integrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIntegration(
  id: string,
  payload: Partial<IntegrationPayload> & { active?: boolean },
): Promise<ClientResult<IntegrationRow>> {
  return adminApi<IntegrationRow>(`integrations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listIntegrationCalls(
  id: string,
  page: number,
  pageSize: number,
): Promise<ClientResult<Paginated<IntegrationCall>>> {
  return adminApi<Paginated<IntegrationCall>>(
    `integrations/${id}/calls?page=${page}&page_size=${pageSize}`,
  );
}

const integrations = {
  listIntegrations,
  listIntegrationPresets,
  createIntegration,
  updateIntegration,
  listIntegrationCalls,
};

export default integrations;
