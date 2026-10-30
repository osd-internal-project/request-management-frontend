/**
 * การเชื่อมต่อที่เราเรียกระบบภายนอก — `admin.integration.manage`
 *
 * Database: outbound_connections
 * Services: core-service — `/admin/outbound-connections/*`; ใช้ตอนส่งงานของ
 * agent (`POST /leads/find` → `POST {base_url}/v1/endpoints/{endpoint_id}`)
 *
 * `api_key` ไม่อยู่ในคำตอบใด ๆ ยกเว้น `revealOutboundConnectionKey` (ลง audit ทุกครั้ง)
 */

import { adminApi, type ClientResult } from "../client";

export interface ActionEndpoint {
  action: string;
  endpoint_id: string;
  timeout_minutes: number;
}

export interface OutboundConnectionRow {
  id: string;
  integration_id: string;
  vendor: string;
  base_url: string;
  active: boolean;
  endpoints: ActionEndpoint[];
  created_at: string;
  updated_at: string;
}

/** What each action sends — from the backend's `AGENT_ACTIONS`, never copied here. */
export interface AgentActionInfo {
  action: string;
  vendor: string;
  payload_fields: string[];
  default_timeout_minutes: number;
}

export interface ConnectionTestResult {
  ok: boolean;
  status: number | null;
  ms: number;
  problem: string | null;
}

export interface OutboundConnectionPayload {
  base_url?: string;
  /** Omitted on update = keep the stored key. */
  api_key?: string;
  active?: boolean;
  /** The whole set — an action left out has no endpoint. */
  endpoints?: ActionEndpoint[];
}

export async function listOutboundConnections(
  integrationId: string,
): Promise<ClientResult<OutboundConnectionRow[]>> {
  return adminApi<OutboundConnectionRow[]>(
    `outbound-connections?integration_id=${encodeURIComponent(integrationId)}`,
  );
}

export async function listAgentActions(): Promise<
  ClientResult<AgentActionInfo[]>
> {
  return adminApi<AgentActionInfo[]>("outbound-connections/actions");
}

export async function createOutboundConnection(
  payload: OutboundConnectionPayload & {
    integration_id: string;
    vendor: string;
    base_url: string;
    api_key: string;
  },
): Promise<ClientResult<OutboundConnectionRow>> {
  return adminApi<OutboundConnectionRow>("outbound-connections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOutboundConnection(
  id: string,
  payload: OutboundConnectionPayload,
): Promise<ClientResult<OutboundConnectionRow>> {
  return adminApi<OutboundConnectionRow>(`outbound-connections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function revealOutboundConnectionKey(
  id: string,
): Promise<ClientResult<{ api_key: string }>> {
  return adminApi<{ api_key: string }>(`outbound-connections/${id}/key`);
}

export async function testOutboundConnection(
  id: string,
  action: string,
): Promise<ClientResult<ConnectionTestResult>> {
  return adminApi<ConnectionTestResult>(`outbound-connections/${id}/test`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

/** The URL CTD actually calls — what the admin compares with the partner's API page. */
export function endpointUrl(baseUrl: string, endpointId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/v1/endpoints/${endpointId}`;
}

const VUVAGENT_ENDPOINT_PATH = /\/v1\/endpoints\/([A-Za-z0-9_-]+)\/?$/;

/**
 * Same rule as the backend's `splitVuvagentUrl` (`agent-records/outbound-connection.ts`),
 * which also refuses a base URL with `/v1/` in it, so a drift here fails loudly.
 */
export function splitVuvagentUrl(input: string): {
  baseUrl: string;
  endpointId: string | null;
} {
  const trimmed = input.trim();
  const match = VUVAGENT_ENDPOINT_PATH.exec(trimmed);
  const base = match ? trimmed.slice(0, match.index) : trimmed;
  return { baseUrl: base.replace(/\/+$/, ""), endpointId: match?.[1] ?? null };
}
