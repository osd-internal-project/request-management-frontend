/**
 * CD-14 ระบบลงนามอิเล็กทรอนิกส์ — core-service `/esign`.
 */
import { apiGet, type ApiResult } from "./core";

/** CD-165 — one signature field of a layout. */
export interface EsignLayoutField {
  key: string;
  label: string;
  page: "first" | "last" | "appendix" | number;
  position:
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
    | "top-left"
    | "top-right";
  order: number;
}

export interface EsignLayout {
  id: string;
  code: string;
  name: string;
  docType: "contract" | "acceptance" | "other";
  active: boolean;
  fields: EsignLayoutField[];
  updatedAt: string;
}

/** CD-166 — a document sent for signing, as its sender sees it. */
export interface EsignEnvelope {
  id: string;
  title: string;
  status: "draft" | "sent" | "completed" | "declined" | "cancelled" | "expired";
  mode: "sequential" | "parallel";
  message: string | null;
  originalName: string;
  originalHash: string;
  signedHash: string | null;
  verifyCode: string | null;
  expiresAt: string;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  signers: {
    id: string;
    fieldKey: string;
    label: string;
    order: number;
    kind: "internal" | "external";
    name: string;
    contact: string | null;
    status: "pending" | "signed" | "declined";
    viewedAt: string | null;
    signedAt: string | null;
    declinedReason: string | null;
  }[];
  history: {
    type: string;
    at: string;
    ip: string | null;
    who: string | null;
  }[];
  /** Only in the answer to "send": the external signers' links, once. */
  links?: { signerId: string; name: string; link: string }[];
}

/** What a signer sees of the document they are asked to sign. */
export interface EsignSignerView {
  title: string;
  message: string | null;
  name: string;
  role: string;
  status: "pending" | "signed" | "declined";
  envelopeStatus: EsignEnvelope["status"];
  expiresAt: string;
  viewed: boolean;
  turn: { may: boolean; waitingFor: number };
  originalName: string;
  verifyCode: string | null;
  /** Public link only. */
  channels?: { channel: "email" | "sms"; to: string }[];
  verified?: boolean;
}

export interface EsignMine {
  signerId: string;
  title: string;
  role: string;
  expiresAt: string;
  turn: { may: boolean; waitingFor: number };
}

export function getEsignLayouts(
  includeInactive = false,
): Promise<ApiResult<EsignLayout[]>> {
  return apiGet(
    `/esign/layouts${includeInactive ? "?include_inactive=true" : ""}`,
  );
}

export function getMySignatures(): Promise<ApiResult<EsignMine[]>> {
  return apiGet("/esign/mine");
}

export function getSignerView(
  signerId: string,
): Promise<ApiResult<EsignSignerView>> {
  return apiGet(`/esign/signers/${encodeURIComponent(signerId)}`);
}

export function getContractSignings(
  contractId: string,
): Promise<ApiResult<EsignEnvelope[]>> {
  return apiGet(`/contracts/${encodeURIComponent(contractId)}/esign`);
}
