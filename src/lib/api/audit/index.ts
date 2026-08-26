/**
 * Audit Logs API
 * 
 * Database: audit_logs
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import { type Paginated, type AuditLogRow } from "../types";

/** Get audit logs */
export async function getAuditLogs(options?: {
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<AuditLogRow>>> {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet<Paginated<AuditLogRow>>(`/admin/audit?${params.toString()}`);
}

/** Grouped for `import auditApi from …` at call sites. */
const auditApi = {
  getAuditLogs,
};

export default auditApi;
