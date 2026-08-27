/**
 * Writes a client component makes while filling in a request.
 *
 * These go through the BFF (`appApi`) rather than `core.ts`: the draft is
 * edited in the browser, and `core.ts` reads the session cookie with
 * `next/headers`, which exists only on the server.
 */
import { adminApi, appApi, type ClientResult } from "./client";
import type {
  ChainPreview,
  RequestAttachment,
  RequestRow,
  RequestType,
} from "./types";

export function createDraft(input: {
  type_code: string;
  form_data?: Record<string, unknown>;
  ref_type?: string;
  ref_id?: string;
}): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>("requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveDraft(
  id: string,
  input: {
    form_data?: Record<string, unknown>;
    ref_type?: string | null;
    ref_id?: string | null;
  },
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function addAttachment(
  id: string,
  input: {
    doc_code?: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  },
): Promise<ClientResult<RequestAttachment>> {
  return appApi<RequestAttachment>(`requests/${id}/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeAttachment(
  id: string,
  attachmentId: string,
): Promise<ClientResult<void>> {
  return appApi<void>(`requests/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export function submitRequest(id: string): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * APV-02 — the route this request would take, before it is submitted.
 *
 * Asked of the server rather than computed here: the ceilings live in a
 * published matrix that an admin can change, and a copy of the rules in the
 * browser would start disagreeing with the real routing the moment they did.
 */
export function previewChain(input: {
  subject_type: string;
  amount?: string;
}): Promise<ClientResult<ChainPreview>> {
  return appApi<ChainPreview>("approvals/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* --- REQ-01 (screen A2): request types are configuration ------------------ */

export function createRequestType(input: {
  code: string;
  name: string;
  form_schema: Record<string, unknown>;
  required_docs?: { code: string; name: string }[];
  return_reason_codes?: { code: string; name: string }[];
  sla_hours?: number;
  active?: boolean;
}): Promise<ClientResult<RequestType>> {
  return adminApi<RequestType>("request-types", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRequestType(
  code: string,
  input: Record<string, unknown>,
): Promise<ClientResult<RequestType>> {
  return adminApi<RequestType>(`request-types/${code}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
