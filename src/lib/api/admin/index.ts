/**
 * Admin Features API (Approval Matrix, Request Types, SLA, etc.)
 * 
 * Database: approval_matrix_versions, request_types, sla_config
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import {
  type ApprovalMatrixVersion,
  type RequestType,
  type SlaConfigRow,
} from "../types";

/** Get approval matrix versions */
export async function getApprovalMatrix(): Promise<
  ApiResult<ApprovalMatrixVersion[]>
> {
  return apiGet<ApprovalMatrixVersion[]>("/admin/approval-matrix");
}

/** Get approval matrix version by ID */
export async function getApprovalMatrixVersion(
  id: string,
): Promise<ApiResult<ApprovalMatrixVersion>> {
  return apiGet<ApprovalMatrixVersion>(`/admin/approval-matrix/${id}`);
}

/**
 * REQ-01 (screen A2) — every type, **including inactive ones**.
 *
 * Not the same list as `/request-types`, which only returns what can be
 * raised: A2 has to show a type that is still being set up, which is exactly
 * the one a requester must not see.
 */
export async function getAdminRequestTypes(): Promise<
  ApiResult<RequestType[]>
> {
  return apiGet<RequestType[]>("/admin/request-types");
}

/** SUP-01 / D-09 — the clock per request type for one company. */
export async function getSLAConfig(companyId?: string): Promise<
  ApiResult<SlaConfigRow[]>
> {
  const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
  return apiGet<SlaConfigRow[]>(`/admin/sla-configs${query}`);
}

/** Grouped for `import adminApi from …` at call sites. */
const adminApi = {
  getApprovalMatrix,
  getApprovalMatrixVersion,
  getAdminRequestTypes,
  getSLAConfig,
};

export default adminApi;
