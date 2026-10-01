/**
 * CD-18 PM โครงการ — core-service `/projects`.
 */
import { apiGet, type ApiResult } from "./core";
import type { Paginated } from "./types";
import type { MilestonePenalty, PenaltyExposure } from "./contracts";

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
  /** CD-154 — the contract's delay penalty runs on it if late. */
  penaltyApplies: boolean;
  penalty: MilestonePenalty | null;
  achievedByName: string | null;
  evidenceNote: string | null;
  evidenceFile: { name: string; size: number | null } | null;
}

export interface ProjectMilestonesView {
  canEdit: boolean;
  /** CD-154 — the contract's delay penalty; rate null = none agreed. */
  penalty: {
    rate: {
      ratePct: number | null;
      period: string | null;
      basis: string | null;
    } | null;
    ceiling: number | null;
    exposure: PenaltyExposure;
  };
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

/** CD-177 — one task of the plan, with the dates worked out for it. */
export interface PlanTaskView {
  id: string;
  parentId: string | null;
  seq: number;
  wbs: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  durationDays: number;
  /** CD-181 — open · in_progress · done. */
  status: TaskStatus;
  startedAt: string | null;
  doneAt: string | null;
  summary: boolean;
  milestone: { id: string; title: string; status: string } | null;
  start: string | null;
  finish: string | null;
  floatDays: number | null;
  critical: boolean;
  predecessors: { taskId: string; wbs: string; lagDays: number }[];
}

export interface ProjectPlanView {
  canEdit: boolean;
  projectStart: string;
  finish: string | null;
  problems: string[];
  /** CD-178 — each milestone's forecast against its due day. */
  milestones: PlanMilestoneForecast[];
  tasks: PlanTaskView[];
}

export interface PlanMilestoneForecast {
  id: string;
  title: string;
  status: string;
  dueOn: string | null;
  installment: { seq: number; label: string; dueOn: string | null } | null;
  forecast: string | null;
  late: boolean;
}

/** CD-178 — what a change to one task would move (nothing saved). */
export interface PlanPreview {
  problems: string[];
  finish: { from: string | null; to: string | null };
  moved: {
    id: string;
    wbs: string;
    title: string;
    fromStart: string | null;
    toStart: string | null;
    fromFinish: string | null;
    toFinish: string | null;
  }[];
  milestones: (PlanMilestoneForecast & { from: string | null })[];
}

export function getProjectPlan(
  id: string,
): Promise<ApiResult<ProjectPlanView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/plan`);
}

export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

/** CD-181 — a task handed to me. */
export interface MyTask {
  id: string;
  wbs: string;
  title: string;
  status: TaskStatus;
  start: string | null;
  finish: string | null;
  critical: boolean;
  summary: boolean;
  milestone: { id: string; title: string } | null;
  project: { id: string; projectNo: string; name: string; status: string };
}

/** CD-181 — one task with its reports and files. */
export interface TaskWorkView {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    ownerUserId: string | null;
    ownerName: string | null;
    startedAt: string | null;
    doneAt: string | null;
    wbs: string;
    start: string | null;
    finish: string | null;
    critical: boolean;
    summary: boolean;
    description: string | null;
    milestone: { id: string; title: string } | null;
  };
  project: { id: string; projectNo: string; name: string };
  canReport: boolean;
  updates: {
    id: string;
    authorId: string;
    authorName: string;
    note: string;
    statusFrom: string | null;
    statusTo: string | null;
    createdAt: string;
    files: string[];
  }[];
  files: {
    id: string;
    updateId: string | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedByName: string;
    uploadedAt: string;
  }[];
}

export function getMyTasks(): Promise<ApiResult<MyTask[]>> {
  return apiGet("/project-tasks/mine");
}

export function getTaskWork(
  projectId: string,
  taskId: string,
): Promise<ApiResult<TaskWorkView>> {
  return apiGet(
    `/projects/${encodeURIComponent(projectId)}/plan/tasks/${encodeURIComponent(taskId)}`,
  );
}
