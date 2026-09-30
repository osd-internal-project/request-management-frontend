/**
 * CD-18 PM โครงการ — core-service `/projects`.
 */
import { apiGet, type ApiResult } from "./core";
import type { Paginated } from "./types";

export type ProjectStatus = "active" | "on_hold" | "closed" | "cancelled";

interface ContractRef {
  id: string;
  contractNo: string;
  title: string;
  counterpartyName: string | null;
  customer: { id: string; customerCode: string; nameTh: string } | null;
}

export interface ProjectRow {
  id: string;
  projectNo: string;
  name: string;
  status: ProjectStatus;
  managerUserId: string;
  managerName: string | null;
  startOn: string | null;
  endOn: string;
  contractValue: number | null;
  currency: string;
  openedAt: string;
  missing: string[];
  contract: ContractRef;
  _count: { members: number };
}

export interface BaselineDeliverable {
  title: string;
  description?: string;
  criteria?: string[];
}

export interface BaselineBoqLine {
  kind: string;
  productCode: string;
  name: string;
  description?: string;
  model?: string;
  quantity: number;
  unit: string;
  refUnitCost: number | null;
}

/** CD-175 — what was sold, copied when the project opened. */
export interface ProjectBaseline {
  contract: {
    contractNo: string;
    title: string;
    party: string;
    value: number | null;
    currency: string;
    startOn: string | null;
    endOn: string | null;
    signedOn: string | null;
  };
  solution: {
    solutionId: string | null;
    title: string;
    versionNo: number | null;
  } | null;
  scope: {
    inScope: string[];
    outOfScope: string[];
    deliverables: BaselineDeliverable[];
    assumptions: { category: string; text: string }[];
  };
  boq: BaselineBoqLine[];
  labor: { role: string; mandays: number; rate: number; note?: string }[];
  cost: {
    lines: {
      index: number;
      productCode: string;
      name: string;
      quantity: number;
      unitCost: number | null;
      source: "quote" | "reference" | null;
    }[];
    materialsTotal: number;
    laborTotal: number;
    total: number;
    missingCost: number;
  } | null;
  installments: {
    seq: number;
    kind: string;
    label: string;
    amount: number;
    dueOn: string | null;
    dueNote: string | null;
    milestone: string | null;
  }[];
  capturedAt: string;
}

export interface ProjectDetail extends Omit<ProjectRow, "contract"> {
  contractId: string;
  customerId: string | null;
  opportunityId: string | null;
  solutionVersionId: string | null;
  baseline: ProjectBaseline;
  note: string | null;
  openedBy: string;
  openedByName: string | null;
  updatedAt: string;
  contract: ContractRef & {
    signedOn: string | null;
    signedVia: "esign" | "manual" | null;
  };
  members: {
    userId: string;
    role: string | null;
    addedAt: string;
    displayName: string;
  }[];
  canManage: boolean;
  canEditTeam: boolean;
}

export interface OpenableContract {
  id: string;
  contractNo: string;
  title: string;
  party: string;
  value: number | null;
  currency: string;
  signedOn: string;
  endOn: string;
}

export interface ProjectPreview {
  contract: {
    id: string;
    contractNo: string;
    title: string;
    signedOn: string | null;
    signedVia: "esign" | "manual" | null;
  };
  project: { id: string; projectNo: string } | null;
  canOpen: boolean;
  problems: string[];
  missing: string[];
  solutionVersionId: string | null;
  baseline: ProjectBaseline;
}

export interface ProjectFilters {
  q?: string;
  status?: string;
  scope?: string;
  page?: string;
}

export function getProjects(
  filters: ProjectFilters,
): Promise<ApiResult<Paginated<ProjectRow>>> {
  const params = new URLSearchParams({ page_size: "50" });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return apiGet(`/projects?${params.toString()}`);
}

export function getProject(id: string): Promise<ApiResult<ProjectDetail>> {
  return apiGet(`/projects/${encodeURIComponent(id)}`);
}

export function getOpenableContracts(): Promise<ApiResult<OpenableContract[]>> {
  return apiGet("/projects/openable-contracts");
}

export function getProjectPreview(
  contractId: string,
): Promise<ApiResult<ProjectPreview>> {
  return apiGet(`/projects/preview/${encodeURIComponent(contractId)}`);
}

/** CD-182 — one milestone of a project. */
export interface ProjectMilestone {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  dueOn: string | null;
  overdue: boolean;
  status: "planned" | "achieved" | "cancelled";
  criteria: {
    text: string;
    met: boolean;
    metAt: string | null;
    metBy: string | null;
    metByName: string | null;
  }[];
  criteriaMet: number;
  installment: {
    id: string;
    seq: number;
    kind: string;
    label: string;
    amount: number;
  } | null;
  achievedOn: string | null;
  achievedAt: string | null;
  achievedByName: string | null;
  evidenceNote: string | null;
  evidenceFile: { name: string; size: number | null } | null;
}

export interface ProjectMilestonesView {
  canEdit: boolean;
  milestones: ProjectMilestone[];
  /** The contract's installments, and the milestone tied to each. */
  installments: {
    id: string;
    seq: number;
    kind: string;
    label: string;
    amount: number;
    dueOn: string | null;
    milestone: string | null;
    milestoneId: string | null;
    milestoneStatus: string | null;
  }[];
}

export function getProjectMilestones(
  id: string,
): Promise<ApiResult<ProjectMilestonesView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/milestones`);
}
