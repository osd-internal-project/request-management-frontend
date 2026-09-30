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
