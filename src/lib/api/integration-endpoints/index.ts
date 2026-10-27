/**
 * Endpoint ที่เราเรียกระบบภายนอก — `admin.integration.manage`
 *
 * Database: integration_endpoints
 * Services: core-service — `/admin/integration-endpoints/*`; ใช้ตอนส่งงานของ
 * agent (`POST /leads/find` → `POST {base_url}/v1/endpoints/{endpoint_id}`)
 *
 * `api_key` ไม่อยู่ในคำตอบใด ๆ ยกเว้น `revealIntegrationEndpointKey` (ลง audit ทุกครั้ง)
 */

import { adminApi, type ClientResult } from "../client";

export interface IntegrationEndpointRow {
  id: string;
  integration_id: string;
  action: string;
  base_url: string;
  endpoint_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationEndpointPayload {
  base_url?: string;
  endpoint_id?: string;
  /** Omitted on update = keep the stored key. */
  api_key?: string;
  active?: boolean;
}

export async function listIntegrationEndpoints(
  integrationId: string,
): Promise<ClientResult<IntegrationEndpointRow[]>> {
  return adminApi<IntegrationEndpointRow[]>(
    `integration-endpoints?integration_id=${encodeURIComponent(integrationId)}`,
  );
}

export async function createIntegrationEndpoint(
  payload: IntegrationEndpointPayload & {
    integration_id: string;
    action: string;
  },
): Promise<ClientResult<IntegrationEndpointRow>> {
  return adminApi<IntegrationEndpointRow>("integration-endpoints", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIntegrationEndpoint(
  id: string,
  payload: IntegrationEndpointPayload,
): Promise<ClientResult<IntegrationEndpointRow>> {
  return adminApi<IntegrationEndpointRow>(`integration-endpoints/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function revealIntegrationEndpointKey(
  id: string,
): Promise<ClientResult<{ api_key: string }>> {
  return adminApi<{ api_key: string }>(`integration-endpoints/${id}/key`);
}

/** The URL CTD actually calls — what the admin compares with the partner's API page. */
export function endpointUrl(row: {
  base_url: string;
  endpoint_id: string;
}): string {
  return `${row.base_url.replace(/\/$/, "")}/v1/endpoints/${row.endpoint_id}`;
}
