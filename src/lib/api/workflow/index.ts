/**
 * The route a request type travels — states, buttons, and the data flow.
 *
 * Database: workflow_definitions, workflow_states, workflow_actions,
 *           workflow_data_maps
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import type { WorkflowDefinition } from "../types";

/** Every version for a company, newest first. */
export async function getWorkflows(
  requestTypeId?: string,
): Promise<ApiResult<WorkflowDefinition[]>> {
  const query = requestTypeId
    ? `?request_type_id=${encodeURIComponent(requestTypeId)}`
    : "";

  return apiGet<WorkflowDefinition[]>(`/admin/workflow${query}`);
}

/** One version with its whole graph — what the editor loads. */
export async function getWorkflow(
  id: string,
): Promise<ApiResult<WorkflowDefinition>> {
  return apiGet<WorkflowDefinition>(`/admin/workflow/${id}`);
}

const workflowApi = { getWorkflows, getWorkflow };

export default workflowApi;
