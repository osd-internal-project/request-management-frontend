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
  type RequestType,
} from "../types";

/** Get requests with filtering */
export async function getRequests(options?: {
  /** Omit for "everything my data scope allows" — SCOPE-02 decides, not us. */
  view?: "mine" | "involved" | "incoming";
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

/** Get my submitted requests */
export async function getMyRequests(
  pageSize: number = 100,
): Promise<ApiResult<Paginated<RequestRow>>> {
  return getRequests({ view: "mine", page_size: pageSize });
}

/**
 * Tickets handed to me that I have not finished.
 *
 * Not reachable through data scope: an employee is scoped to what they raised,
 * and a request sent to them was raised by somebody else.
 */
export async function getIncomingRequests(
  pageSize: number = 100,
): Promise<ApiResult<Paginated<RequestRow>>> {
  return getRequests({ view: "incoming", page_size: pageSize });
}

/** Get requests I'm involved in */
export async function getInvolvedRequests(
  pageSize: number = 100,
): Promise<ApiResult<Paginated<RequestRow>>> {
  return getRequests({ view: "involved", page_size: pageSize });
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
  getMyRequests,
  getIncomingRequests,
  getInvolvedRequests,
  getRequest,
  getRequestTypes,
};

export default requestsApi;
