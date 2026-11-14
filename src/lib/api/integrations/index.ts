/**
 * ระบบภายนอก — `admin.integration.manage` (22 ต.ค. 2569)
 *
 * Database: integrations, integration_calls
 * Services: core-service — `/admin/integrations/*`
 *
 * หนึ่งระบบถือกุญแจ API และ webhook ของตัวเอง (`integration_id` บนสองตารางนั้น)
 */

import { adminApi, appApi, type ClientResult } from "../client";
import type { KeyScope } from "../api-keys";
import type { Paginated } from "../types";

/** `system` = hub ทุกบริษัท `/system/integrations` (system.integration.manage). */
function integrationApi<T>(scope: KeyScope, path: string, init?: RequestInit) {
  return scope === "system" ? appApi<T>(`system/${path}`, init) : adminApi<T>(path, init);
}

/** `app` = ในนามบริษัท, `delegated` = ในนามผู้ใช้ที่ login เอง (`X-User-Token`). */
export type IntegrationMode = "app" | "delegated";

export interface IntegrationRow {
  id: string;
  name: string;
  description: string | null;
  modes: IntegrationMode[];
  allow_acting_user: boolean;
  keycloak_client_ids: string[];
  /** null = ระบบภายนอกกลาง */
  company_id: string | null;
  /** ระบบกลางเท่านั้น: บริษัทที่ใช้ได้ — ว่าง = ทุกบริษัท */
  allowed_company_ids: string[];
  active: boolean;
  api_key_count: number;
  webhook_count: number;
  connection_count: number;
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

/**
 * `companyId` ใช้กับ scope `system` เท่านั้น: uuid = บริษัทเดียว, `"system"` = เฉพาะของกลาง,
 * ไม่ส่ง = ทุกบริษัท
 */
export async function listIntegrations(
  scope: KeyScope = "company",
  companyId?: string,
): Promise<ClientResult<IntegrationRow[]>> {
  const query = scope === "system" && companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
  return integrationApi<IntegrationRow[]>(scope, `integrations${query}`);
}

export async function listIntegrationPresets(
  scope: KeyScope = "company",
): Promise<ClientResult<IntegrationPreset[]>> {
  return integrationApi<IntegrationPreset[]>(scope, "integrations/presets");
}

export async function createIntegration(
  payload: IntegrationPayload,
  scope: KeyScope = "company",
): Promise<ClientResult<IntegrationRow>> {
  return integrationApi<IntegrationRow>(scope, "integrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIntegration(
  id: string,
  payload: Partial<IntegrationPayload> & {
    active?: boolean;
    allowed_company_ids?: string[];
  },
  scope: KeyScope = "company",
): Promise<ClientResult<IntegrationRow>> {
  return integrationApi<IntegrationRow>(scope, `integrations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listIntegrationCalls(
  id: string,
  page: number,
  pageSize: number,
  scope: KeyScope = "company",
): Promise<ClientResult<Paginated<IntegrationCall>>> {
  return integrationApi<Paginated<IntegrationCall>>(
    scope,
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
