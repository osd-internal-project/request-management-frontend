/**
 * Approvals API
 * 
 * Database: approvals
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import { type Paginated, type ApprovalCase } from "../types";

/** Get approval inbox */
export async function getApprovalsInbox(options?: {
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<ApprovalCase>>> {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet<Paginated<ApprovalCase>>(`/approvals/inbox?${params.toString()}`);
}

/** Get a single approval case by ID */
export async function getApproval(
  approvalId: string,
): Promise<ApiResult<ApprovalCase>> {
  return apiGet<ApprovalCase>(`/approvals/${approvalId}`);
}

/** Grouped for `import approvalsApi from …` at call sites. */
const approvalsApi = {
  getApprovalsInbox,
  getApproval,
};

export default approvalsApi;
