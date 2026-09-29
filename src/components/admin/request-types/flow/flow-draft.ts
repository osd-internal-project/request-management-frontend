import type {
  FlowAssigneeRule,
  FlowCondition,
  FlowReceiverRule,
  FlowStepScope,
  MatrixLevel,
  RequestFlowVersion,
  RequiredDoc,
  SubRequestTypeRule,
  SuggestedFlow,
} from "@/lib/api/types";
import { rowsFromSchema, toSchema, type FieldRow } from "../schema-rows";

/** A forward exit; the first whose condition holds is taken, so the last has none. */
export interface ExitDraft {
  readonly to: string;
  readonly condition: FlowCondition | null;
}

export interface StepDraft {
  readonly code: string;
  readonly name: string;
  readonly rows: FieldRow[];
  readonly subRequests: SubRequestTypeRule[];
  readonly requiresApproval: boolean;
  readonly assignee: FlowAssigneeRule;
  readonly slaHours: number | null;
  readonly forward: ExitDraft[];
  /** Steps the work may be sent back to without checking this step's form. */
  readonly backward: string[];
  /** v2: the step's type — the status it sits under. Ignored on v1. */
  readonly kind: FlowStepScope;
  readonly approvalLevels: MatrixLevel[];
  readonly returnTo: string | null;
  readonly requiredDocs: RequiredDoc[];
  readonly receiver: FlowReceiverRule;
}

export interface FlowDraft {
  /** 1: steps inside in_progress; 2: steps cover the whole path. New flows are 2. */
  readonly schemaVersion: 1 | 2;
  readonly steps: StepDraft[];
}

/** The v2 step types in the order a request usually meets them. */
export const STEP_KINDS: readonly FlowStepScope[] = [
  "draft",
  "pending_approval",
  "submitted",
  "in_progress",
  "approved",
];

/** Which parts of a step its type uses; the backend refuses the others on publish. */
export function kindUses(kind: FlowStepScope) {
  const requester =
    kind === "draft" || kind === "returned" || kind === "approved";
  return {
    form: requester || kind === "in_progress",
    docs: requester,
    subRequests: kind === "in_progress",
    receiver: kind === "submitted" || kind === "in_progress",
    approval: kind === "pending_approval",
  };
}

export function draftFromVersion(version: RequestFlowVersion | null): FlowDraft {
  if (!version) return { schemaVersion: 2, steps: [] };

  const exits = [...version.transitions].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    schemaVersion: version.schemaVersion === 2 ? 2 : 1,
    steps: [...version.steps]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((step) => ({
        code: step.code,
        name: step.name,
        rows: rowsFromSchema(step.formSchema),
        subRequests: step.subRequestTypes,
        requiresApproval: step.requiresApproval,
        assignee: step.assigneeRule ?? { type: "keep" },
        slaHours: step.slaHours,
        forward: exits
          .filter((exit) => exit.fromStepCode === step.code && !exit.backward)
          .map((exit) => ({ to: exit.toStepCode, condition: exit.condition })),
        backward: exits
          .filter((exit) => exit.fromStepCode === step.code && exit.backward)
          .map((exit) => exit.toStepCode),
        kind: step.scopeStatus ?? "in_progress",
        approvalLevels: step.approvalLevels ?? [],
        returnTo: step.returnToStepCode ?? null,
        requiredDocs: step.requiredDocs ?? [],
        receiver: step.receiverRule ?? { type: "keep" },
      })),
  };
}

/** "สร้าง flow จากค่าเดิม": the type's fixed lifecycle restated as a v2 draft. */
export function draftFromSuggested(suggested: SuggestedFlow): FlowDraft {
  return {
    schemaVersion: 2,
    steps: suggested.steps.map((step) => ({
      ...emptyStep(step.code, step.name, step.scope_status),
      rows: rowsFromSchema(step.form_schema ?? null),
      subRequests: step.sub_request_types ?? [],
      approvalLevels: step.approval_levels ?? [],
      returnTo: step.return_to_step ?? null,
      requiredDocs: step.required_docs ?? [],
      forward: suggested.transitions
        .filter((exit) => exit.from_step === step.code)
        .map((exit) => ({ to: exit.to_step, condition: null })),
    })),
  };
}

/** Problems the backend would refuse, shown before publishing; it stays the judge. */
export function v2Warnings(
  draft: FlowDraft,
): { code: string; kind: "first" | "last" | "returnTo" }[] {
  if (draft.schemaVersion !== 2 || !draft.steps.length) return [];
  const warnings: { code: string; kind: "first" | "last" | "returnTo" }[] = [];
  const first = draft.steps[0];
  if (first.kind !== "draft")
    warnings.push({ code: first.code, kind: "first" });
  for (const step of draft.steps) {
    if (!step.forward.length && step.kind !== "approved") {
      warnings.push({ code: step.code, kind: "last" });
    }
    if (step.kind === "pending_approval" && !step.returnTo) {
      warnings.push({ code: step.code, kind: "returnTo" });
    }
  }
  return warnings;
}

/** The POST body for publishing; array order is the order exits are tried. */
export function draftToPayload(draft: FlowDraft, companyId: string) {
  return {
    company_id: companyId,
    ...(draft.schemaVersion === 2
      ? { schema_version: 2, steps: draft.steps.map(v2StepPayload) }
      : { steps: draft.steps.map(v1StepPayload) }),
    transitions: transitionsPayload(draft),
  };
}

/** Only the parts the step's type uses, so hidden leftovers never reach publish. */
function v2StepPayload(step: StepDraft) {
  const uses = kindUses(step.kind);
  return {
    code: step.code,
    name: step.name,
    scope_status: step.kind,
    ...(uses.form && step.rows.length
      ? { form_schema: toSchema(step.rows) }
      : {}),
    ...(uses.docs ? { required_docs: step.requiredDocs } : {}),
    ...(uses.subRequests ? { sub_request_types: step.subRequests } : {}),
    ...(uses.receiver ? { receiver_rule: receiverPayload(step.receiver) } : {}),
    ...(uses.approval
      ? {
          approval_levels: step.approvalLevels,
          ...(step.returnTo ? { return_to_step: step.returnTo } : {}),
        }
      : {}),
    ...(step.slaHours ? { sla_hours: step.slaHours } : {}),
  };
}

function receiverPayload(rule: FlowReceiverRule) {
  if (rule.type === "user") return { type: "user", user_id: rule.userId };
  if (rule.type === "step") return { type: "step", step_code: rule.stepCode };
  return { type: rule.type };
}

function v1StepPayload(step: StepDraft) {
  return {
    code: step.code,
    name: step.name,
    ...(step.rows.length ? { form_schema: toSchema(step.rows) } : {}),
    sub_request_types: step.subRequests,
    requires_approval: step.requiresApproval,
    assignee_rule:
      step.assignee.type === "user"
        ? { type: "user", user_id: step.assignee.userId }
        : { type: step.assignee.type },
    ...(step.slaHours ? { sla_hours: step.slaHours } : {}),
  };
}

function transitionsPayload(draft: FlowDraft) {
  return draft.steps.flatMap((step) => [
    ...step.forward.map((exit) => ({
      from_step: step.code,
      to_step: exit.to,
      ...(exit.condition ? { condition: exit.condition } : {}),
    })),
    ...step.backward.map((to) => ({
      from_step: step.code,
      to_step: to,
      backward: true,
    })),
  ]);
}

export function emptyStep(
  code: string,
  name: string,
  kind: FlowStepScope = "in_progress",
): StepDraft {
  return {
    code,
    name,
    kind,
    approvalLevels: [],
    returnTo: null,
    requiredDocs: [],
    receiver: { type: "keep" },
    rows: [],
    subRequests: [],
    requiresApproval: false,
    assignee: { type: "keep" },
    slaHours: null,
    forward: [],
    backward: [],
  };
}

/** Appends a step and, when the previous last step led nowhere, links it forward. */
export function addStep(draft: FlowDraft, name: string): FlowDraft {
  const code = nextCode(draft);
  const last = draft.steps[draft.steps.length - 1];
  const linked = last && !last.forward.length
    ? draft.steps.map((step) =>
        step === last ? { ...step, forward: [{ to: code, condition: null }] } : step,
      )
    : draft.steps;

  return { ...draft, steps: [...linked, emptyStep(code, name)] };
}

function nextCode(draft: FlowDraft): string {
  let index = draft.steps.length + 1;
  while (draft.steps.some((step) => step.code === `STEP_${index}`)) index += 1;
  return `STEP_${index}`;
}

export function updateStep(
  draft: FlowDraft,
  code: string,
  patch: Partial<StepDraft>,
): FlowDraft {
  const renamed = patch.code !== undefined && patch.code !== code ? patch.code : null;

  return {
    ...draft,
    steps: draft.steps.map((step) => {
      const own = step.code === code ? { ...step, ...patch } : step;
      if (!renamed) return own;
      // Exits point at codes, so a rename follows through every reference.
      return {
        ...own,
        forward: own.forward.map((exit) =>
          exit.to === code ? { ...exit, to: renamed } : exit,
        ),
        backward: own.backward.map((to) => (to === code ? renamed : to)),
        returnTo: own.returnTo === code ? renamed : own.returnTo,
        receiver:
          own.receiver.type === "step" && own.receiver.stepCode === code
            ? { type: "step", stepCode: renamed }
            : own.receiver,
      };
    }),
  };
}

/** Removes a step and every exit that pointed at it. */
export function removeStep(draft: FlowDraft, code: string): FlowDraft {
  return {
    ...draft,
    steps: draft.steps
      .filter((step) => step.code !== code)
      .map((step) => ({
        ...step,
        forward: step.forward.filter((exit) => exit.to !== code),
        backward: step.backward.filter((to) => to !== code),
        returnTo: step.returnTo === code ? null : step.returnTo,
        receiver:
          step.receiver.type === "step" && step.receiver.stepCode === code
            ? { type: "keep" }
            : step.receiver,
      })),
  };
}

export function moveStep(draft: FlowDraft, code: string, offset: -1 | 1): FlowDraft {
  const from = draft.steps.findIndex((step) => step.code === code);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= draft.steps.length) return draft;

  const steps = [...draft.steps];
  [steps[from], steps[to]] = [steps[to], steps[from]];
  return { ...draft, steps };
}

/** Fields a condition may name: the requester's form plus every step's. */
export function conditionFields(
  typeRows: readonly FieldRow[],
  draft: FlowDraft,
): { value: string; label: string }[] {
  return [...typeRows, ...draft.steps.flatMap((step) => step.rows)].map((row) => ({
    value: row.key,
    label: row.title || row.key,
  }));
}
