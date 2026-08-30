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
export async function getAdminRequestTypes(
  companyId?: string,
): Promise<ApiResult<RequestType[]>> {
  // A1 shows one company per tab, independent of the header switcher, so it
  // asks for a company by id. The backend refuses one the caller does not
  // belong to (SCOPE-03) rather than answering it.
  return apiGet<RequestType[]>(
    companyId
      ? `/admin/request-types?company_id=${encodeURIComponent(companyId)}`
      : "/admin/request-types",
  );
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
