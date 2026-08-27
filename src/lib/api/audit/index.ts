/**
 * Audit Log (SUP-04)
 *
 * Database: audit_logs — append-only
 * Services: user-service
 */

import { apiGet, type ApiResult } from "../core";
import type { AuditLogRow, Paginated } from "../types";

/** §11.7's filters — every one the API accepts, and no more. */
export interface AuditQuery {
  page?: number;
  page_size?: number;
  actor_id?: string;
  event_type?: string;
  resource_type?: string;
  resource_id?: string;
  /** ISO 8601. */
  from?: string;
  to?: string;
}

/**
 * SUP-04 — read the log.
 *
 * The route is `/audit-logs`, matching §11.7. It was previously written as
 * `/admin/audit`, which does not exist on either service and answered 404, so
 * the screen showed a load error for every visit.
 */
export async function getAuditLogs(
  options?: AuditQuery,
): Promise<ApiResult<Paginated<AuditLogRow>>> {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));

  for (const key of [
    "actor_id",
    "event_type",
    "resource_type",
    "resource_id",
    "from",
    "to",
  ] as const) {
    const value = options?.[key];
    if (value) params.set(key, value);
  }

  return apiGet<Paginated<AuditLogRow>>(`/audit-logs?${params.toString()}`);
}

/** Grouped for `import auditApi from …` at call sites. */
const auditApi = {
  getAuditLogs,
};

export default auditApi;
