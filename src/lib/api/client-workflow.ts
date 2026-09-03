/**
 * Writes the หน้า Set Workflow screen makes.
 *
 * Through the BFF (`adminApi`) rather than `core.ts`: the graph is edited in
 * the browser, and `core.ts` reads the session cookie with `next/headers`,
 * which exists only on the server.
 */
import { adminApi, type ClientResult } from "./client";
import type {
  WorkflowAction,
  WorkflowDefinition,
  WorkflowState,
} from "./types";

/** Opens the next draft version for a type. */
export function createWorkflow(input: {
  request_type_id: string;
  name: string;
  company_id?: string;
}): Promise<ClientResult<WorkflowDefinition>> {
  return adminApi<WorkflowDefinition>("workflow", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Replaces the whole graph of a draft.
 *
 * One call rather than per-row saves: the screen edits a picture, and a
 * half-applied picture is a route with an orphan state in it. The server
 * validates and writes it in a single transaction.
 */
export function saveWorkflowGraph(
  id: string,
  graph: { states: WorkflowState[]; actions: WorkflowAction[] },
): Promise<ClientResult<WorkflowDefinition>> {
  return adminApi<WorkflowDefinition>(`workflow/${id}/graph`, {
    method: "PUT",
    body: JSON.stringify({
      states: graph.states.map((state, index) => ({
        key: state.key,
        name: state.name,
        phase: state.phase,
        kind: state.kind,
        form_schema: state.formSchema ?? undefined,
        sla_hours: state.slaHours ?? undefined,
        is_start: state.isStart,
        sort_order: state.sortOrder ?? index,
      })),
      actions: graph.actions.map((action, index) => ({
        from_state_key: action.fromStateKey,
        action_key: action.actionKey,
        to_state_key: action.toStateKey,
        label: action.label,
        authority: action.authority,
        form_schema: action.formSchema ?? undefined,
        condition: action.condition || undefined,
        confirm_required: action.confirmRequired ?? false,
        sort_order: action.sortOrder ?? index,
        data_maps: (action.dataMaps ?? []).map((map) => ({
          source_field: map.sourceField,
          variable_name: map.variableName,
          target_column: map.targetColumn,
        })),
      })),
    }),
  });
}

/**
 * Validates, generates the BPMN, deploys it to Flowable, marks it published.
 *
 * There is no update route for a published version: a request already running
 * keeps the route it started on.
 */
export function publishWorkflow(
  id: string,
): Promise<ClientResult<WorkflowDefinition>> {
  return adminApi<WorkflowDefinition>(`workflow/${id}/publish`, {
    method: "POST",
  });
}
