/**
 * CD-161 คลังสัญญา — core-service `/contracts` (`legal.contract.*`).
 */
import { apiGet, type ApiResult } from "../core";
import type { Paginated } from "../types";

export type ContractKind = "standard" | "nda" | "msa" | "other";
export type ContractStatus = "active" | "renewed" | "ended" | "cancelled";

export interface ContractRow {
  id: string;
  contractNo: string;
  title: string;
  kind: ContractKind;
  status: ContractStatus;
  confidential: boolean;
  startOn: string | null;
  endOn: string;
  value: string | number | null;
  currency: string;
  counterpartyName: string | null;
  counterpartyTaxId: string | null;
  ownerUserId: string;
  customer: { id: string; customerCode: string; nameTh: string } | null;
  _count: { documents: number };
}

export interface ContractDocument {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  textStatus: "extracted" | "empty" | "failed" | "not_pdf";
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface ContractDetail extends ContractRow {
  note: string | null;
  opportunityId: string | null;
  requestId: string | null;
  renewalOpportunityId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName: string | null;
  documents: ContractDocument[];
  access: { userId: string; displayName: string; grantedAt: string }[];
  canManage: boolean;
}

export interface ContractFilters {
  search?: string;
  text?: string;
  kind?: string;
  status?: string;
  ends_from?: string;
  ends_to?: string;
  confidential?: string;
  page?: string;
}

export function getContracts(
  filters: ContractFilters,
): Promise<ApiResult<Paginated<ContractRow>>> {
  const params = new URLSearchParams({ page_size: "50" });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return apiGet(`/contracts?${params.toString()}`);
}

export function getContract(id: string): Promise<ApiResult<ContractDetail>> {
  return apiGet(`/contracts/${encodeURIComponent(id)}`);
}
