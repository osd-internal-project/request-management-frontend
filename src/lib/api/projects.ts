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
  /** CD-185 — the change request it comes from; it starts once approved. */
  changeRequest: { id: string; seq: number; status: string } | null;
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

/** CD-188 — progress from what closed, against the plan. */
export interface ProjectProgressView {
  canEdit: boolean;
  threshold: number;
  today: string;
  work: { pct: number | null; done: number; total: number };
  milestones: { achieved: number; total: number; pct: number | null };
  planned: { pct: number | null; variance: number | null };
  reports: {
    id: string;
    reportedPct: number;
    computedPct: number;
    plannedPct: number | null;
    reason: string | null;
    note: string | null;
    reportedAt: string;
    reportedBy: string;
    reportedByName: string;
  }[];
}

export function getProjectProgress(
  id: string,
): Promise<ApiResult<ProjectProgressView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/progress`);
}

/** CD-179 — one line of the reference budget. */
export interface BudgetLineView {
  category: "material" | "labor" | "other";
  code: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unitCost: number | null;
  amount: number;
}

export interface ProjectBudgetView {
  canEdit: boolean;
  current: {
    id: string;
    versionNo: number;
    status: "draft" | "locked" | "superseded";
    lines: BudgetLineView[];
    contractValue: number | null;
    byCategory: Record<"material" | "labor" | "other", number>;
    total: number;
    margin: number | null;
    marginPct: number | null;
    missingCost: number;
    note: string | null;
    changeRequestId: string | null;
    createdAt: string;
    createdByName: string | null;
    lockedAt: string | null;
    lockedByName: string | null;
    lockProblems: string[];
  } | null;
  versions: {
    id: string;
    versionNo: number;
    status: string;
    total: number;
    changeRequestId: string | null;
    lockedAt: string | null;
    lockedByName: string | null;
  }[];
  actual: null;
}

export function getProjectBudget(
  id: string,
): Promise<ApiResult<ProjectBudgetView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/budget`);
}

/** CD-185 — a change request and its effect. */
export interface ProjectChangeView {
  id: string;
  seq: number;
  label: string;
  title: string;
  reason: string;
  scopeAdded: string | null;
  scopeRemoved: string | null;
  scheduleDays: number;
  costLines: BudgetLineView[];
  costChange: number;
  priceChange: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled";
  impact: {
    cost: { from: number | null; to: number | null; change: number };
    value: { from: number | null; to: number | null; change: number };
    margin: {
      from: number | null;
      to: number | null;
      fromPct: number | null;
      toPct: number | null;
    };
  } | null;
  request: { id: string; requestNo: string | null } | null;
  error: string | null;
  submittedAt: string | null;
  submittedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface ProjectChangesView {
  canEdit: boolean;
  typeConfigured: boolean;
  budget: {
    versionNo: number;
    total: number;
    contractValue: number | null;
  } | null;
  changes: ProjectChangeView[];
}

export function getProjectChanges(
  id: string,
): Promise<ApiResult<ProjectChangesView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/changes`);
}

/** CD-183 — a project risk. */
export interface ProjectRiskView {
  id: string;
  seq: number;
  label: string;
  source: "technical" | "legal" | "project";
  title: string;
  description: string | null;
  likelihood: number;
  impact: number;
  score: number;
  level: "low" | "medium" | "high" | "critical";
  ownerUserId: string | null;
  ownerName: string | null;
  response: string | null;
  status: "open" | "mitigated" | "accepted" | "closed";
  reviewEveryDays: number;
  lastReviewedAt: string | null;
  nextReviewOn: string | null;
  needsPlan: boolean;
  reviewOverdue: boolean;
}

export interface ProjectRisksView {
  canEdit: boolean;
  today: string;
  risks: (ProjectRiskView & {
    reviews: {
      id: string;
      note: string;
      level: string;
      status: string;
      reviewedByName: string;
      reviewedAt: string;
    }[];
  })[];
}

export type RiskAttentionRow = ProjectRiskView & {
  project: {
    id: string;
    projectNo: string;
    name: string;
    managerName: string | null;
  };
};

export function getProjectRisks(
  id: string,
): Promise<ApiResult<ProjectRisksView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/risks`);
}

export function getRiskAttention(): Promise<ApiResult<RiskAttentionRow[]>> {
  return apiGet("/project-risks/attention");
}

/** CD-184 — an issue met on the way. */
export interface ProjectIssueView {
  id: string;
  seq: number;
  label: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  scheduleImpactDays: number;
  costImpact: number;
  ownerUserId: string;
  ownerName: string | null;
  dueOn: string | null;
  overdue: boolean;
  task: { id: string; title: string } | null;
  status: "open" | "resolved";
  resolution: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  changeRequest: { id: string; label: string } | null;
  createdAt: string;
}

export interface ProjectIssuesView {
  canEdit: boolean;
  today: string;
  summary: {
    open: number;
    overdue: number;
    scheduleDays: number;
    cost: number;
  };
  issues: ProjectIssueView[];
}

export function getProjectIssues(
  id: string,
): Promise<ApiResult<ProjectIssuesView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/issues`);
}

/** CD-186 — a contact with the customer. */
export interface CustomerLogView {
  id: string;
  seq: number;
  label: string;
  kind: "meeting" | "call" | "email" | "site_visit" | "other";
  occurredOn: string;
  contactName: string | null;
  summary: string;
  decision: string | null;
  affectsScope: boolean;
  owesChange: boolean;
  changeRequest: { id: string; label: string } | null;
  createdAt: string;
  createdByName: string | null;
}

export interface CustomerLogsView {
  canWrite: boolean;
  canConvert: boolean;
  owesChange: number;
  logs: CustomerLogView[];
}

export function getCustomerLogs(
  id: string,
): Promise<ApiResult<CustomerLogsView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/customer-logs`);
}

/** CD-193 — one installment of the contract and where it stands. */
export interface PaymentInstallmentView {
  seq: number;
  kind: string;
  label: string;
  amount: number;
  dueOn: string | null;
  milestone: {
    id: string;
    title: string;
    status: string;
    forecast: string | null;
  } | null;
  state: "paid" | "invoiced" | "billable" | "waiting";
  expectedBillOn: string | null;
  expectedPayOn: string | null;
  overdue: boolean;
  received: number;
  billing: {
    invoiceNo: string | null;
    invoicedOn: string | null;
    invoicedAmount: number | null;
    paidOn: string | null;
    paidAmount: number | null;
    source: string;
    note: string | null;
    recordedAt: string;
  } | null;
}

export interface ProjectPaymentsView {
  canEdit: boolean;
  today: string;
  creditDays: number;
  totals: {
    scheduled: number;
    invoiced: number;
    received: number;
    outstanding: number;
    overdue: number;
    billable: number;
  };
  installments: PaymentInstallmentView[];
  forecast: {
    months: { month: string; received: number; expected: number }[];
    unscheduled: number;
  };
}

export function getProjectPayments(
  id: string,
): Promise<ApiResult<ProjectPaymentsView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/payments`);
}

/** CD-191 — one line of the close-out checklist. */
export interface CloseCheckView {
  key: string;
  label: string;
  ok: boolean;
  blocking: boolean;
  detail: string | null;
}

export interface CloseDocumentView {
  id: string;
  title: string;
  note: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByName: string | null;
}

export interface LessonView {
  id: string;
  kind: "went_well" | "improve" | "recommend";
  text: string;
  kbmsStatus: string;
  createdBy: string;
  createdAt: string;
  createdByName: string | null;
}

export interface ProjectCloseoutView {
  canEdit: boolean;
  canWrite: boolean;
  typeConfigured: boolean;
  projectStatus: string;
  closeout: {
    status: "draft" | "submitted" | "approved" | "rejected";
    summary: string | null;
    error: string | null;
    requestId: string | null;
    requestNo: string | null;
    submittedAt: string | null;
    submittedByName: string | null;
    decidedAt: string | null;
  } | null;
  checks: CloseCheckView[];
  problems: string[];
  required: { title: string; documentIds: string[] }[];
  documents: CloseDocumentView[];
  lessons: LessonView[];
}

export function getProjectCloseout(
  id: string,
): Promise<ApiResult<ProjectCloseoutView>> {
  return apiGet(`/projects/${encodeURIComponent(id)}/closeout`);
}
