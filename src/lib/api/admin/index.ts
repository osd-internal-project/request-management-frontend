/**
 * Admin Features API (Approval Matrix, Request Types, SLA, etc.)
 * 
 * Database: approval_matrix_versions, request_types, sla_config
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import { type ApprovalMatrixVersion } from "../types";

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

/** Get request types (admin view) */
export async function getAdminRequestTypes(): Promise<
  ApiResult<ApprovalMatrixVersion[]>
> {
  return apiGet<ApprovalMatrixVersion[]>("/admin/request-types");
}

/** Get SLA configuration */
export async function getSLAConfig(): Promise<
  ApiResult<ApprovalMatrixVersion>
> {
  return apiGet<ApprovalMatrixVersion>("/admin/sla");
}

/** Grouped for `import adminApi from …` at call sites. */
const adminApi = {
  getApprovalMatrix,
  getApprovalMatrixVersion,
  getAdminRequestTypes,
  getSLAConfig,
};

export default adminApi;
