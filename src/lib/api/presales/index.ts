/**
 * CD-132 ออกแบบ Solution — server-side reads; mutations go through `appApi`
 * from the client components, same split as sales.
 */
import { apiGet, type ApiResult } from "../core";

export type AssumptionCategory =
  "technical" | "customer" | "third_party" | "commercial";

export interface SolutionAssumption {
  category: AssumptionCategory;
  text: string;
}

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

export interface SolutionVersionSummary {
  versionNo: number;
  status: SolutionVersionStatus;
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
  deal: {
    id: string;
    opportunityCode: string;
    title: string;
    partyName: string | null;
  } | null;
  request: { id: string; requestNo: string | null; status: string } | null;
  /** The "ขอ Solution" form as Sales filled it in. */
  brief: Record<string, string>;
  versions: SolutionVersionSummary[];
  version: SolutionVersionSummary & {
    id: string;
    summary: string;
    design: string;
    assumptions: SolutionAssumption[];
    inScope: string[];
    outOfScope: string[];
    deliverables: SolutionDeliverable[];
    lockedBy: string | null;
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
  latest: { versionNo: number; status: SolutionVersionStatus } | null;
  /** CD-131 — questions the customer has not answered yet. */
  waiting_customer: number;
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
