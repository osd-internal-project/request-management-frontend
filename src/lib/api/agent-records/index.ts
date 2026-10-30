/**
 * งานที่ส่งให้ AI agent ภายนอก (Vuvagent) ทำในเบื้องหลัง — อ่านอย่างเดียว.
 * สิทธิ์ดูผูกต่อ action (`crm.sales.read` สำหรับ `lead.find`); backend กรองแถวให้.
 *
 * Database: agent_records
 * Services: core-service — `/agent-records`, `/agent-records/stream` (SSE),
 * `POST /leads/find`; Vuvagent ปิดงานผ่าน external `PATCH agent-records/:id`
 */

import { apiGet, type ApiResult } from "../core";
import type { LeadStatus, Paginated } from "../types";

export type AgentRecordStatus = "processing" | "done" | "failed";

export interface AgentRecordRow {
  id: string;
  action: string;
  status: AgentRecordStatus;
  input: { topic?: string } & Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  /** set when nobody answered in time; a late answer can still finish it */
  timedOutAt: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRecordLead {
  id: string;
  name: string;
  contactName: string | null;
  status: LeadStatus;
  createdAt: string;
}

export interface AgentRecordDetail extends AgentRecordRow {
  leads: AgentRecordLead[];
}

/** What `/agent-records/stream` pushes as event `record`. */
export interface AgentRecordStamp {
  id: string;
  status: AgentRecordStatus;
  updatedAt: string;
}

export async function getAgentRecords(options: {
  status?: string;
  page: number;
  page_size: number;
}): Promise<ApiResult<Paginated<AgentRecordRow>>> {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  params.set("page", String(options.page));
  params.set("page_size", String(options.page_size));
  return apiGet(`agent-records?${params.toString()}`);
}

export async function getAgentRecord(
  id: string,
): Promise<ApiResult<AgentRecordDetail>> {
  return apiGet(`agent-records/${id}`);
}
