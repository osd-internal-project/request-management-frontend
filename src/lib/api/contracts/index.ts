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

/** CD-146 — one clause of a template or a draft. */
export interface ContractClause {
  key: string;
  heading: string;
  body: string;
}

/** CD-146 — a contract template. */
export interface ContractTemplate {
  id: string;
  code: string;
  name: string;
  kind: "standard" | "nda" | "msa" | "other";
  active: boolean;
  clauses: ContractClause[];
  updatedAt: string;
}

export interface TemplateVariables {
  variables: { name: string; label: string }[];
  termPattern: string;
}

/** CD-146 — the draft card on a contract request. */
export interface DraftForRequest {
  eligible: boolean;
  editable?: boolean;
  draft: {
    id: string;
    template: { id: string; code: string; name: string };
    latestVersionNo: number;
    missing: string[];
    versions: {
      versionNo: number;
      note: string | null;
      createdAt: string;
      createdBy: string;
      createdByName: string;
    }[];
  } | null;
  templates: ContractTemplate[];
}

export type ClauseMark = "template" | "edited" | "added";

/** CD-146 — one version of a draft, each clause marked against the template. */
export interface ContractDraftView {
  id: string;
  request: { id: string; requestNo: string | null; status: string };
  template: { id: string; code: string; name: string };
  editable: boolean;
  latestVersionNo: number;
  missing: string[];
  version: {
    versionNo: number;
    note: string | null;
    createdAt: string;
    createdBy: string;
    createdByName: string;
  };
  clauses: (ContractClause & {
    mark: ClauseMark;
    templateBody: string | null;
  })[];
  removed: ContractClause[];
  counts: { edited: number; added: number; removed: number };
}

export function getContractTemplates(
  includeInactive = false,
): Promise<ApiResult<ContractTemplate[]>> {
  return apiGet(
    `/contract-templates${includeInactive ? "?include_inactive=true" : ""}`,
  );
}

export function getTemplateVariables(): Promise<ApiResult<TemplateVariables>> {
  return apiGet("/contract-templates/variables");
}

export function getDraftForRequest(
  requestId: string,
): Promise<ApiResult<DraftForRequest>> {
  return apiGet(
    `/contract-drafts/by-request/${encodeURIComponent(requestId)}`,
  );
}

export function getContractDraft(
  id: string,
  version?: number,
): Promise<ApiResult<ContractDraftView>> {
  return apiGet(
    `/contract-drafts/${encodeURIComponent(id)}${version ? `?version=${version}` : ""}`,
  );
}

/** CD-147 — a piece of a clause's text diff. */
export interface DiffOp {
  type: "same" | "add" | "del";
  text: string;
}

/** CD-147 — two versions side by side, clause by clause. */
export interface DraftComparison {
  from: number;
  to: number;
  clauses: {
    key: string;
    heading: string;
    change: "same" | "changed" | "added" | "removed";
    moved: boolean;
    headingBefore: string | null;
    diff: DiffOp[];
  }[];
  counts: { changed: number; added: number; removed: number };
}

/** CD-147 — a reviewer's comment on a clause and the drafter's answer. */
export interface ReviewComment {
  id: string;
  roundId: string;
  clauseKey: string;
  clauseHeading: string;
  body: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  status: "open" | "resolved" | "declined";
  response: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  resolvedInVersion: number | null;
  /** The clause changed since the version under review. */
  changedSince: boolean;
}

export interface ReviewRound {
  id: string;
  roundNo: number;
  versionNo: number;
  note: string | null;
  status: "open" | "closed";
  openedByName: string | null;
  openedAt: string;
  closedByName: string | null;
  closedAt: string | null;
  closedVersionNo: number | null;
  openCount: number;
  comments: ReviewComment[];
}

export interface DraftReviews {
  latestVersionNo: number;
  rounds: ReviewRound[];
}

export function getDraftReviews(
  id: string,
): Promise<ApiResult<DraftReviews>> {
  return apiGet(`/contract-drafts/${encodeURIComponent(id)}/reviews`);
}

export function compareDraftVersions(
  id: string,
  from: number,
  to: number,
): Promise<ApiResult<DraftComparison>> {
  return apiGet(
    `/contract-drafts/${encodeURIComponent(id)}/compare?from=${from}&to=${to}`,
  );
}

/** CD-159 — the approval of a draft version. */
export interface DraftApproval {
  typeConfigured: boolean;
  latestVersionNo: number;
  /** Why it cannot be asked yet. */
  blockers: string[];
  canRequest: boolean;
  approvedVersionNo: number | null;
  current: {
    id: string;
    versionNo: number;
    riskLevel: string | null;
    state: "not_needed" | "missing" | "draft" | "pending" | "approved" | "rejected";
    request: { id: string; requestNo: string | null; status: string } | null;
    error: string | null;
    requestedAt: string;
    requestedByName: string;
  } | null;
  voided: {
    id: string;
    versionNo: number;
    requestId: string | null;
    voidedAt: string;
    voidReason: string | null;
  }[];
}

export function getDraftRisk(
  id: string,
): Promise<ApiResult<ContractRiskView>> {
  return apiGet(`/contract-drafts/${encodeURIComponent(id)}/risk`);
}

export function getDraftApproval(
  id: string,
): Promise<ApiResult<DraftApproval>> {
  return apiGet(`/contract-drafts/${encodeURIComponent(id)}/approval`);
}
