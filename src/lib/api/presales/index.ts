/**
 * CD-132 ออกแบบ Solution — server-side reads; mutations go through `appApi`
 * from the client components, same split as sales.
 */
import { apiGet, type ApiResult } from "../core";

export type AssumptionCategory =
  "technical" | "customer" | "third_party" | "commercial" | "constraint";

export interface SolutionAssumption {
  category: AssumptionCategory;
  text: string;
  /** CD-133 — dependencies only: who must deliver it. */
  owner?: string;
  /** CD-133 — dependencies only: needed by, YYYY-MM-DD. */
  neededBy?: string;
}

/** CD-133 — the version's overall feasibility verdict. */
export type FeasibilityVerdict =
  "unassessed" | "feasible" | "conditional" | "not_feasible";

/** CD-134 — a deliverable with the criteria the customer accepts it by. */
export interface SolutionDeliverable {
  title: string;
  description: string;
  criteria: string[];
}

export type SolutionVersionStatus = "draft" | "locked" | "superseded";

export interface SolutionFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

/** CD-143 — where a version stands with its approval. */
export type SolutionApprovalStatus =
  "none" | "pending" | "approved" | "rejected" | "cancelled";

export interface SolutionVersionSummary {
  versionNo: number;
  status: SolutionVersionStatus;
  approvalStatus: SolutionApprovalStatus;
  changeNote: string | null;
  lockedAt: string | null;
  createdAt: string;
}

export type RequirementKind = "business" | "technical";
export type RequirementAssessment =
  "unassessed" | "feasible" | "not_feasible" | "needs_info";

/** CD-131 — one analysed requirement. */
export interface SolutionRequirement {
  id: string;
  seq: number;
  kind: RequirementKind;
  text: string;
  assessment: RequirementAssessment;
  /** The reason, or the question to the customer when `needs_info`. */
  note: string;
  customerAnswer: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
}

export interface RequirementCounts {
  total: number;
  unassessed: number;
  feasible: number;
  not_feasible: number;
  needs_info: number;
  waiting_customer: number;
}

/** CD-140 — one technical question to the customer, and its answer. */
export interface SolutionClarification {
  id: string;
  seq: number;
  question: string;
  askedOn: string;
  askedBy: string;
  answer: string | null;
  respondent: string | null;
  answeredOn: string | null;
  answerRecordedAt: string | null;
  answeredOnVersionNo: number | null;
  affectsScope: boolean;
  scopeResolvedVersionNo: number | null;
  scopeResolvedAt: string | null;
}

export interface ClarificationCounts {
  total: number;
  awaiting_answer: number;
  scope_open: number;
}

/** CD-141 — one technical risk; score = likelihood × impact. */
export type RiskStatus = "open" | "mitigated" | "accepted" | "closed";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface SolutionRisk {
  id: string;
  seq: number;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  owner: string;
  mitigation: string;
  status: RiskStatus;
  score: number;
  level: RiskLevel;
}

export interface RiskCounts {
  total: number;
  open: number;
  open_high: number;
  needs_plan: number;
}

/** CD-139 — a Demo or POC, with its equipment and findings. */
export type DemoStatus = "planned" | "done" | "cancelled";
export type CriterionResult = "pending" | "met" | "not_met";

export interface DemoCriterion {
  text: string;
  result: CriterionResult;
  note: string;
}

export interface DemoEquipment {
  id: string;
  name: string;
  serial: string;
  quantity: number;
  takenBy: string;
  outOn: string;
  returnedOn: string | null;
}

export interface DemoFinding {
  id: string;
  seq: number;
  text: string;
  requiresChange: boolean;
  recordedOnVersionNo: number;
  resolvedVersionNo: number | null;
}

export interface SolutionDemo {
  id: string;
  seq: number;
  requestId: string | null;
  kind: "demo" | "poc";
  title: string;
  scheduledOn: string | null;
  site: string;
  people: string;
  plan: string;
  criteria: DemoCriterion[];
  outcome: string;
  status: DemoStatus;
  closedAt: string | null;
  equipment: DemoEquipment[];
  findings: DemoFinding[];
}

export interface DemoCounts {
  total: number;
  planned: number;
  equipment_out: number;
  findings_open: number;
}

/** CD-139 — the deal's Demo/POC requests, to start a demo from. */
export interface DemoRequestOption {
  id: string;
  requestNo: string | null;
  status: string;
  objective: string;
  used: boolean;
}

/** CD-138 — the TOR / RFP: facts, original files, clauses and answers. */
export type TorCompliance = "unanswered" | "comply" | "partial" | "not_comply";

export interface TorClause {
  id: string;
  seq: number;
  clauseNo: string;
  text: string;
  mandatory: boolean;
  compliance: TorCompliance;
  response: string;
  reference: string;
}

export interface SolutionTor {
  facts: {
    buyer: string;
    projectNo: string;
    submissionDeadline: string | null;
    bidBond: string;
    note: string;
  } | null;
  files: SolutionFile[];
  clauses: TorClause[];
}

export interface TorCounts {
  total: number;
  mandatory: number;
  mandatory_answered: number;
  mandatory_gaps: number;
  partial: number;
  unanswered: number;
}

/** CD-135 — one BOQ line, SAP code and all. */
export type BoqKind = "equipment" | "material" | "software" | "service";

export interface BoqLine {
  kind: BoqKind;
  productCode: string;
  name: string;
  description: string;
  model: string;
  quantity: number;
  unit: string;
  refUnitCost: number | null;
}

export interface BoqSummary {
  lines: number;
  missing_code: number;
  missing_cost: number;
  ref_total: number;
}

/** CD-136 — the cost estimate of a version. */
export interface LaborLine {
  role: string;
  mandays: number;
  rate: number;
  note: string;
}

export interface CostLine {
  index: number;
  productCode: string;
  name: string;
  quantity: number;
  unitCost: number | null;
  source: "quote" | "reference" | null;
  quoteId: string | null;
  vendorName: string | null;
  expired: boolean;
}

export interface CostEstimate {
  lines: CostLine[];
  labor: LaborLine[];
  materials_total: number;
  labor_total: number;
  total: number;
  missing_cost: number;
  expired_quotes: number;
  complete: boolean;
}

export interface PartnerQuote {
  id: string;
  seq: number;
  vendorName: string;
  vendorCode: string;
  quoteNo: string;
  quoteDate: string | null;
  validUntil: string | null;
  requestId: string | null;
  lines: { lineIndex: number; productCode: string; unitPrice: number }[];
  fileName: string | null;
  sizeBytes: number | null;
}

export interface SolutionDetail {
  id: string;
  companyId: string;
  opportunityId: string;
  requestId: string;
  title: string;
  currentVersionNo: number;
  can_manage: boolean;
  /** CD-131 — may record the customer's answers (Pre-Sales or the deal's sales). */
  can_answer: boolean;
  requirements: SolutionRequirement[];
  requirement_counts: RequirementCounts;
  clarifications: SolutionClarification[];
  clarification_counts: ClarificationCounts;
  /** CD-141 — highest score first. */
  risks: SolutionRisk[];
  risk_counts: RiskCounts;
  /** CD-139 — oldest first. */
  demos: SolutionDemo[];
  demo_counts: DemoCounts;
  /** CD-135 — the BOQ of the version shown. */
  boq_summary: BoqSummary;
  /** CD-135/136 — handoff 3: the newest approved version with a complete estimate. */
  pricing_ready: { versionNo: number } | null;
  /** CD-136 — the estimate of the version shown. */
  cost: CostEstimate | null;
  partner_quotes: PartnerQuote[];
  cost_settings: {
    labor_rates: { role: string; rate: number }[];
    vendor_quote_configured: boolean;
  };
  /** CD-138 — the TOR and its clauses. */
  tor: SolutionTor;
  tor_counts: TorCounts;
  deal: {
    id: string;
    opportunityCode: string;
    title: string;
    partyName: string | null;
  } | null;
  request: { id: string; requestNo: string | null; status: string } | null;
  /** The "ขอ Solution" form as Sales filled it in. */
  brief: Record<string, string>;
  /** CD-143 — may this version be sent for approval (blocker = why not). */
  approval: {
    configured: boolean;
    blocker: string | null;
    request: { id: string; requestNo: string | null; status: string } | null;
  };
  versions: SolutionVersionSummary[];
  version: SolutionVersionSummary & {
    id: string;
    summary: string;
    design: string;
    assumptions: SolutionAssumption[];
    inScope: string[];
    outOfScope: string[];
    deliverables: SolutionDeliverable[];
    feasibility: FeasibilityVerdict;
    feasibilityNote: string;
    /** CD-135 — locked with the version. */
    boq: BoqLine[];
    lockedBy: string | null;
    approvalRequestId: string | null;
    approvedAt: string | null;
    updatedAt: string;
    files: SolutionFile[];
  };
}

export interface SolutionForRequest {
  is_solution_request: boolean;
  can_start: boolean;
  solution: { id: string; currentVersionNo: number } | null;
}

export interface DealSolution {
  id: string;
  title: string;
  requestId: string;
  currentVersionNo: number;
  updatedAt: string;
  latest: {
    versionNo: number;
    status: SolutionVersionStatus;
    approvalStatus: SolutionApprovalStatus;
  } | null;
  /** CD-131 — questions the customer has not answered yet. */
  waiting_customer: number;
  /** CD-140 — open technical questions, and answers the SOW must follow. */
  clarification_counts: ClarificationCounts;
  /** CD-141 — open high/critical risks, and those without a plan. */
  risk_counts: RiskCounts;
  /** CD-139 — equipment still out, findings still to work in. */
  demo_counts: DemoCounts;
  /** CD-138 — mandatory TOR clauses still open. */
  tor_counts: TorCounts;
  /** CD-135 — handoff 3: the newest approved version, if any. */
  pricing_ready_version: number | null;
}

export async function getSolution(
  id: string,
  versionNo?: number,
): Promise<ApiResult<SolutionDetail>> {
  return apiGet(
    versionNo
      ? `presales/solutions/${id}/versions/${versionNo}`
      : `presales/solutions/${id}`,
  );
}

export async function getSolutionForRequest(
  requestId: string,
): Promise<ApiResult<SolutionForRequest>> {
  return apiGet(`presales/solutions/by-request/${requestId}`);
}

export async function getDealSolutions(
  opportunityId: string,
): Promise<ApiResult<DealSolution[]>> {
  return apiGet(`opportunities/${opportunityId}/solutions`);
}

/** CD-133 — the contract request's assumptions, from the deal's approved Solution. */
export interface ContractAssumptions {
  solution: { id: string; title: string; versionNo: number } | null;
  text: string | null;
}

export async function getContractAssumptions(
  dealRef: string,
): Promise<ApiResult<ContractAssumptions>> {
  return apiGet(
    `opportunities/${encodeURIComponent(dealRef)}/contract-assumptions`,
  );
}

/** CD-137 — the technical proposal of an approved version; no cost at all. */
export interface SolutionProposalView {
  letterhead: {
    nameTh: string;
    nameEn: string | null;
    taxId: string | null;
    branch: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo: string | null;
  };
  solution: { id: string; title: string };
  deal: {
    opportunityCode: string;
    title: string;
    partyName: string | null;
    customerCode: string | null;
    contactName: string | null;
  } | null;
  version: {
    versionNo: number;
    approvedAt: string | null;
    lockedAt: string | null;
    superseded: boolean;
    summary: string;
    design: string;
    inScope: string[];
    outOfScope: string[];
    deliverables: SolutionDeliverable[];
  };
  boq: {
    lineNo: number;
    kind: BoqKind;
    kindLabel: string;
    productCode: string;
    name: string;
    description: string;
    model: string;
    quantity: number;
    unit: string;
  }[];
  assumptions: (SolutionAssumption & { categoryLabel: string })[];
  dependencies: (SolutionAssumption & { categoryLabel: string })[];
}

export async function getSolutionProposal(
  id: string,
  versionNo: number,
): Promise<ApiResult<SolutionProposalView>> {
  return apiGet(`presales/solutions/${id}/versions/${versionNo}/proposal`);
}

// --- CD-142 ข้อมูลคู่ค้า ---------------------------------------------------------

export type ExpiryState = "expired" | "expiring" | "valid" | "none";
export type PartnerFileCategory =
  "certificate" | "datasheet" | "catalog" | "other";

export interface PartnerBrand {
  brand: string;
  level: string;
  /** YYYY-MM-DD, "" = no expiry. */
  expiresOn: string;
}

export interface PartnerCertification {
  name: string;
  holders: number;
  expiresOn: string;
}

export interface PartnerContact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface PartnerListItem {
  code: string;
  name: string;
  taxId: string | null;
  /** null when SAP could not be reached. */
  active: boolean | null;
  has_profile: boolean;
  brands: PartnerBrand[];
  certification_count: number;
  expiry: { expired: number; expiring: number };
}

export interface PartnerList {
  sap_available: boolean;
  total: number;
  items: PartnerListItem[];
}

export interface SapVendor {
  code: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  currency: string | null;
  paymentTerms: string | null;
  active: boolean;
}

export interface PartnerDetail {
  code: string;
  sap_available: boolean;
  vendor: SapVendor | null;
  name: string;
  can_manage: boolean;
  profile: {
    exists: boolean;
    summary: string;
    brands: (PartnerBrand & { expiry: ExpiryState })[];
    certifications: (PartnerCertification & { expiry: ExpiryState })[];
    contacts: PartnerContact[];
    updatedAt: string | null;
    updatedBy: string | null;
  };
  files: {
    id: string;
    category: PartnerFileCategory;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    uploadedAt: string;
  }[];
}

export async function getPartners(q?: string): Promise<ApiResult<PartnerList>> {
  return apiGet(
    q ? `presales/partners?q=${encodeURIComponent(q)}` : "presales/partners",
  );
}

export async function getPartner(
  code: string,
): Promise<ApiResult<PartnerDetail>> {
  return apiGet(`presales/partners/${encodeURIComponent(code)}`);
}
