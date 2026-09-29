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

export interface SolutionDetail {
  id: string;
  companyId: string;
  opportunityId: string;
  requestId: string;
  title: string;
  currentVersionNo: number;
  can_manage: boolean;
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
