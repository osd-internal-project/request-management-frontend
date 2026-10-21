/**
 * บันทึกกระบวนการ End-to-End 7 ขั้น — อ่านอย่างเดียว (`audit.read`)
 *
 * Database: process_flow_logs — append-only
 * Services: core-service — `/process-logs` (OSD Workflow เขียนผ่าน external
 * `POST process/logs`)
 */

import { apiGet, type ApiResult } from "../core";
import type { Paginated } from "../types";

export interface ProcessLogRow {
  id: string;
  event_id: string | null;
  instance_id: string;
  workflow_key: string;
  stage_no: number;
  stage_code: string;
  stage_name: string;
  team_code: string | null;
  step_code: string;
  step_name: string | null;
  status: string;
  decision: string | null;
  ref_type: string | null;
  ref_no: string | null;
  actor_email: string | null;
  actor_name: string | null;
  comment: string | null;
  payload: unknown;
  occurred_at: string;
  created_at: string;
}

export interface ProcessStage {
  no: number;
  code: string;
  team: string;
  name: string;
}

export interface ProcessLogQuery {
  page?: number;
  page_size?: number;
  instance_id?: string;
  stage_no?: string;
  ref_no?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function getProcessLogs(
  options?: ProcessLogQuery,
): Promise<ApiResult<Paginated<ProcessLogRow>>> {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));

  for (const key of [
    "instance_id",
    "stage_no",
    "ref_no",
    "status",
    "from",
    "to",
  ] as const) {
    const value = options?.[key];
    if (value) params.set(key, value);
  }

  return apiGet<Paginated<ProcessLogRow>>(`/process-logs?${params.toString()}`);
}

export async function getProcessStages(): Promise<ApiResult<ProcessStage[]>> {
  return apiGet<ProcessStage[]>("/process-logs/stages");
}

const processLogsApi = { getProcessLogs, getProcessStages };

export default processLogsApi;
