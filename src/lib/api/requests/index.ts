/**
 * Requests API
 * 
 * Database: requests
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import {
  type Paginated,
  type RequestDetail,
  type RequestRow,
  type RequestTree,
  type RequestType,
} from "../types";

/**
 * Get requests with filtering.
 *
 * `view` narrows what the caller may already see; it can never widen it —
 * `AccessService` decides that once, on the backend (SCOPE-02).
 */
export async function getRequests(options?: {
  /** Omit for everything visible, the four tabs' union plus groups I lead. */
  view?:
    | "involved"
    | "created"
    | "incoming"
    | "approver"
    | "awaiting"
    | "led";
  status?: string;
  type_code?: string;
  q?: string;
  overdue?: boolean;
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<RequestRow>>> {
  const params = new URLSearchParams();
  if (options?.view) params.set("view", options.view);
  if (options?.status) params.set("status", options.status);
  if (options?.type_code) params.set("type_code", options.type_code);
  if (options?.q) params.set("q", options.q);
  if (options?.overdue) params.set("overdue", "true");
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet<Paginated<RequestRow>>(`/requests?${params.toString()}`);
}

/**
 * The four tabs of "งานค้างของฉัน", and the "งานทั้งหมด" screen.
 *
 * One helper each rather than callers passing `view` themselves: the tab a
 * page opens and the count it prints have to come from the same query, and a
 * literal repeated at two call sites is how those two drift apart.
 */
export const myWorkViews = {
  /** ทั้งหมด — everything I raised, received, carry, or may approve. */
  involved: (pageSize = 100) =>
    getRequests({ view: "involved", page_size: pageSize }),
  /** สร้าง — raised by me. */
  created: (pageSize = 100) =>
    getRequests({ view: "created", page_size: pageSize }),
  /** รับเรื่อง — handed to me, whatever became of it. */
  incoming: (pageSize = 100) =>
    getRequests({ view: "incoming", page_size: pageSize }),
  /** อนุมัติ — every request naming me anywhere in its approval route. */
  approver: (pageSize = 100) =>
    getRequests({ view: "approver", page_size: pageSize }),
  /**
   * The badge on that tab: the subset actually waiting on my decision.
   *
   * One row is fetched, not none — the count lives in the envelope's `total`,
   * and asking for `page_size: 0` would be a page of nothing with a total the
   * server still had to compute.
   */
  awaiting: () => getRequests({ view: "awaiting", page_size: 1 }),
};

/**
 * งานทั้งหมด — every request this person may open: their own, the groups they
 * head with subtrees, and the groups a scope grant reaches.
 */
export async function getLedRequests(options?: {
  status?: string;
  type_code?: string;
  q?: string;
  overdue?: boolean;
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<RequestRow>>> {
  return getRequests({ ...options, view: "led" });
}

/**
 * H2.2 ข้อ 4 — this request, everything spawned under it, and its parent.
 *
 * Its own call rather than part of the detail read: the panel is one query
 * against an index, and a request with no children should not pay to find that
 * out inside the query that fetches the form, the documents and the chain.
 */
export async function getRequestTree(
  requestId: string,
): Promise<ApiResult<RequestTree>> {
  return apiGet<RequestTree>(`/requests/${requestId}/tree`);
}

/** Get a single request by ID */
export async function getRequest(
  requestId: string,
): Promise<ApiResult<RequestDetail>> {
  return apiGet<RequestDetail>(`/requests/${requestId}`);
}

/** Get all available request types */
export async function getRequestTypes(): Promise<
  ApiResult<RequestType[]>
> {
  return apiGet<RequestType[]>("/request-types");
}

/** Grouped for `import requestsApi from …` at call sites. */
const requestsApi = {
  getRequests,
  getLedRequests,
  myWorkViews,
  getRequest,
  getRequestTree,
  getRequestTypes,
};

export default requestsApi;
