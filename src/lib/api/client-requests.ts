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
  RequestComment,
  RequestAttachment,
  RequestRow,
  RequestType,
} from "./types";

export function createDraft(input: {
  type_code: string;
  form_data?: Record<string, unknown>;
  ref_type?: string;
  ref_id?: string;
  /** The person this ticket is handed to. Required by the time it is submitted. */
  receiver_user_id?: string;
  /** Omit to accept the request type's own ทีมผู้รับ. */
  receiver_org_unit_id?: string;
  /** Set when this request is spawned from another one. */
  parent_request_id?: string;
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
    receiver_user_id?: string | null;
    receiver_org_unit_id?: string;
  },
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * The moves a request can make that were reachable only from the API.
 *
 * `return`, `cancel`, `hold` and `resume` have had routes, DTOs and rules since
 * the foundation sprint, and no button anywhere — so the only way to bounce a
 * request back was to not accept it. Each takes a reason the backend requires:
 * a request that moved backwards with nothing said cannot be explained to the
 * person it moved away from.
 */
/**
 * REQ-04. `reason_code` is singular and required — one code from the type's
 * own list, which is what makes bounce causes countable.
 *
 * This was typed `reason_codes: string[]` until 1 ก.ย. 2569: a field the API
 * has never had. Because the wrapper declared the wrong shape faithfully, the
 * compiler had nothing to object to, and the only symptom was a 400 at the
 * moment somebody tried to bounce a request.
 */
export function returnRequest(
  id: string,
  input: { reason_code: string; note: string },
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/return`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelRequest(
  id: string,
  input: { reason: string },
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function holdRequest(
  id: string,
  input: { reason: string },
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/hold`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resumeRequest(
  id: string,
  input: { note?: string } = {},
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/resume`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** H2.2 — a note on a request, without moving it. */
export function addComment(
  id: string,
  body: string,
): Promise<ClientResult<RequestComment>> {
  return appApi<RequestComment>(`requests/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/**
 * APV-02 — the decision, with the reason it now always carries.
 *
 * Approvals required no note until 1 Sep 2026. An approval nobody can explain
 * afterwards is exactly what the authority-usage report is asked for.
 */
export function decideCase(
  caseId: string,
  input: {
    decision: "approve" | "reject" | "return";
    note: string;
    reason_codes?: string[];
  },
): Promise<ClientResult<void>> {
  return appApi<void>(`approvals/${caseId}/decide`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** REQ-03 — uploads the file itself; the backend stores it in object storage. */
export function uploadAttachment(
  id: string,
  file: File,
  docCode?: string,
): Promise<ClientResult<RequestAttachment>> {
  const form = new FormData();
  form.append("file", file);
  if (docCode) form.append("doc_code", docCode);

  return appApi<RequestAttachment>(`requests/${id}/attachments`, {
    method: "POST",
    body: form,
  });
}

/** Where the browser downloads a stored attachment, through the BFF. */
export function attachmentFileUrl(id: string, attachmentId: string): string {
  return `/api/app/requests/${id}/attachments/${attachmentId}/file`;
}

export function removeAttachment(
  id: string,
  attachmentId: string,
): Promise<ClientResult<void>> {
  return appApi<void>(`requests/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

/** The named receiver accepts the ticket — the working clock starts here. */
export function receiveRequest(id: string): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/receive`, { method: "POST" });
}

/** Hands the work on — `ASSIGNED` the first time, `HANDOVER` afterwards. */
export function assignRequest(
  id: string,
  input: { assignee_user_id: string; note?: string },
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/assign`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** The doing team says the work is finished. */
/**
 * H2.2 ข้อ 3 — finishing the work, with the receiver's form if the type has one.
 *
 * The data is optional here and required by the *type*: `receiverFormSchema`
 * says which fields are mandatory, and `complete` refuses without them.
 */
export function completeRequest(
  id: string,
  receiverFormData?: Record<string, unknown>,
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(
      receiverFormData ? { receiver_form_data: receiverFormData } : {},
    ),
  });
}

/** The requester accepts the result and the ticket ends. */
/** H2.2 — closing may carry a note, and does not have to. */
export function closeRequest(
  id: string,
  note?: string,
): Promise<ClientResult<RequestRow>> {
  return appApi<RequestRow>(`requests/${id}/close`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
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
  /**
   * Whose chart a `หัวหน้าทีม` level climbs.
   *
   * Omitted means the caller, which is right for the `:pre` ladder and wrong
   * for the one that reviews finished work — that one follows whoever carries
   * the request, so the receiver chosen on this screen is who to send.
   */
  chart_owner_user_id?: string;
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
  /** The default ทีมผู้รับ for requests of this type. */
  receiver_org_unit_id?: string;
  form_schema: Record<string, unknown>;
  receiver_form_schema?: Record<string, unknown>;
  eligible_org_unit_ids?: string[];
  required_docs?: { code: string; name: string; required?: boolean }[];
  /** Defaults to the session company; the admin screen passes the company tab on screen. */
  company_ids?: string[];
  return_reason_codes?: { code: string; name: string }[];
  sla_hours?: number;
  sla_coverage?: string;
  active?: boolean;
}): Promise<ClientResult<RequestType>> {
  return adminApi<RequestType>("request-types", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * REQ-01 — removes a type outright.
 *
 * Answers 409 `REQ_TYPE_IN_USE` once anything has been raised against it, so
 * the caller shows the server's message rather than deciding for itself.
 */
export function deleteRequestType(
  code: string,
): Promise<ClientResult<void>> {
  return adminApi<void>(`request-types/${code}`, { method: "DELETE" });
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
