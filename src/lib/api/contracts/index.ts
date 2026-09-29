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
  /** CD-148 */
  ndaScope: string | null;
  ndaDirection: "mutual" | "disclosing" | "receiving" | null;
  /** CD-149 — the MSA this contract is made under. */
  masterContractId: string | null;
  master: { id: string; contractNo: string; title: string } | null;
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
  /** CD-149 — contracts made under this MSA (the viewer may see). */
  subContracts: {
    id: string;
    contractNo: string;
    title: string;
    status: ContractStatus;
    endOn: string;
  }[];
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

/** CD-153..156 — a contract's terms and what follows from them. */
export interface ContractTermsView {
  contractValue: number | null;
  recorded: boolean;
  liability: {
    unlimited: boolean;
    capAmount: number | null;
    note: string | null;
    approval: {
      state:
        | "not_needed"
        | "missing"
        | "draft"
        | "pending"
        | "approved"
        | "rejected";
      request: { id: string; requestNo: string | null; status: string } | null;
      error: string | null;
    };
  };
  penalty: {
    ratePct: number | null;
    period: string | null;
    basis: string | null;
    basisNote: string | null;
    capPct: number | null;
    capAmount: number | null;
    ceiling: number | null;
  };
  warranty: {
    months: number | null;
    scope: string | null;
    exclusions: string | null;
    acceptedOn: string | null;
    period: { startsOn: string; endsOn: string } | null;
  };
  termination: {
    noticeDays: number | null;
    conditions: string | null;
    consequences: string | null;
    steps: string[];
  };
  /** CD-151 */
  service: {
    levels: Record<
      "critical" | "high" | "medium" | "low",
      { responseHours: number; resolutionHours: number }
    > | null;
    coverage: "H24X7" | "H8X7" | "H8X5" | null;
    availabilityPct: number | null;
    reportEvery: "monthly" | "quarterly" | null;
  };
  updatedAt: string | null;
}

export function getContractTerms(
  id: string,
): Promise<ApiResult<ContractTermsView>> {
  return apiGet(`/contracts/${encodeURIComponent(id)}/terms`);
}

/** CD-163 — one obligation drawn from a contract. */
export interface ContractObligation {
  id: string;
  contractId: string;
  title: string;
  detail: string | null;
  clause: string | null;
  ownerUserId: string;
  ownerName?: string;
  dueOn: string | null;
  status: "open" | "done" | "waived";
  doneAt: string | null;
  doneBy: string | null;
  doneByName?: string | null;
  doneNote: string | null;
  createdAt: string;
}

/** "Mine" also names the contract, and whether I may open it. */
export interface MyObligation extends ContractObligation {
  contract: {
    id: string;
    contractNo: string;
    title: string;
    counterpartyName: string | null;
    customer: { nameTh: string } | null;
  };
  contractOpenable: boolean;
}

export function getContractObligations(
  id: string,
): Promise<ApiResult<ContractObligation[]>> {
  return apiGet(`/contracts/${encodeURIComponent(id)}/obligations`);
}

export function getMyObligations(): Promise<ApiResult<MyObligation[]>> {
  return apiGet("/contract-obligations/mine");
}

/** CD-164 — one installment of the billing schedule. */
export interface ContractInstallment {
  id: string;
  seq: number;
  kind: "deposit" | "progress" | "final" | "retention";
  label: string;
  amount: number;
  sharePct: number | null;
  dueOn: string | null;
  dueNote: string | null;
  milestone: string | null;
  guaranteeType: "bank_guarantee" | "cheque" | "cash" | null;
  guaranteeAmount: number | null;
  guaranteeRef: string | null;
  guaranteeExpiresOn: string | null;
}

/** CD-164 — the schedule, its total and how far it is from the value. */
export interface ContractInstallmentsView {
  contractValue: number | null;
  currency: string;
  total: number;
  /** + over, − short; null when the contract has no value. */
  difference: number | null;
  balanced: boolean;
  installments: ContractInstallment[];
}

export function getContractInstallments(
  id: string,
): Promise<ApiResult<ContractInstallmentsView>> {
  return apiGet(`/contracts/${encodeURIComponent(id)}/installments`);
}

/** CD-158 — one issue behind the risk level. */
export interface RiskIssue {
  title: string;
  detail: string | null;
  clause: string | null;
  severity: "low" | "medium" | "high";
  escalate: boolean;
}

/** CD-158 — the legal risk assessment and whether it allows signing. */
export interface ContractRiskView {
  assessed: boolean;
  level: "low" | "medium" | "high" | "critical" | null;
  summary: string | null;
  issues: RiskIssue[];
  assessedBy: string | null;
  assessedAt: string | null;
  opinion: {
    state: "not_needed" | "missing" | "draft" | "pending" | "approved" | "rejected";
    request: { id: string; requestNo: string | null; status: string } | null;
    error: string | null;
  };
  /** ready: null = not assessed. */
  signing: { ready: boolean | null; reason: string | null };
}

export function getContractRisk(
  id: string,
): Promise<ApiResult<ContractRiskView>> {
  return apiGet(`/contracts/${encodeURIComponent(id)}/risk`);
}
