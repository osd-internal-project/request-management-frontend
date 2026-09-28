import type {
  FlowAssigneeRule,
  FlowCondition,
  RequestFlowVersion,
  SubRequestTypeRule,
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
}

export interface FlowDraft {
  readonly steps: StepDraft[];
}

export function draftFromVersion(version: RequestFlowVersion | null): FlowDraft {
  if (!version) return { steps: [] };

  const exits = [...version.transitions].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
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
      })),
  };
}

/** The POST body for publishing; array order is the order exits are tried. */
export function draftToPayload(draft: FlowDraft, companyId: string) {
  return {
    company_id: companyId,
    steps: draft.steps.map((step) => ({
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
    })),
    transitions: draft.steps.flatMap((step) => [
      ...step.forward.map((exit) => ({
        from_step: step.code,
        to_step: exit.to,
        ...(exit.condition ? { condition: exit.condition } : {}),
      })),
      ...step.backward.map((to) => ({ from_step: step.code, to_step: to, backward: true })),
    ]),
  };
}

export function emptyStep(code: string, name: string): StepDraft {
  return {
    code,
    name,
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

  return { steps: [...linked, emptyStep(code, name)] };
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
      };
    }),
  };
}

/** Removes a step and every exit that pointed at it. */
export function removeStep(draft: FlowDraft, code: string): FlowDraft {
  return {
    steps: draft.steps
      .filter((step) => step.code !== code)
      .map((step) => ({
        ...step,
        forward: step.forward.filter((exit) => exit.to !== code),
        backward: step.backward.filter((to) => to !== code),
      })),
  };
}

export function moveStep(draft: FlowDraft, code: string, offset: -1 | 1): FlowDraft {
  const from = draft.steps.findIndex((step) => step.code === code);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= draft.steps.length) return draft;

  const steps = [...draft.steps];
  [steps[from], steps[to]] = [steps[to], steps[from]];
  return { steps };
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
