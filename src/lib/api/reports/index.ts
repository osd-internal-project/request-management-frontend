/**
 * Reports API
 *
 * Services: core-service
 */
import { apiGet, type ApiResult } from "../core";

/** One row of REQ-09 — a step position within a request type. */
export interface BottleneckRow {
  type_code: string;
  step_no: number;
  approver_role: string;
  approver_user_id: string | null;
  decided_count: number;
  pending_count: number;
  mean_hours: number | null;
  max_hours: number | null;
}

export function getBottleneck(options?: {
  type_code?: string;
  from?: string;
  to?: string;
}): Promise<ApiResult<BottleneckRow[]>> {
  const params = new URLSearchParams();
  if (options?.type_code) params.set("type_code", options.type_code);
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);

  const query = params.toString();
  return apiGet<BottleneckRow[]>(
    `/reports/request-bottleneck${query ? `?${query}` : ""}`,
  );
}
