/**
 * เหตุการณ์ใน CTD → เริ่ม workflow บน OSD Workflow — `admin.integration.manage`
 *
 * Database: workflow_triggers, workflow_starts
 * Services: core-service — `/admin/workflow-triggers/*`
 *
 * `channel_key` ส่งเข้าอย่างเดียว — ไม่มีคำตอบไหนส่งกลับมา (`has_channel_key` บอกแค่ว่าตั้งแล้ว)
 */

import { adminApi, type ClientResult } from "../client";

export interface WorkflowTriggerEvent {
  key: string;
  label: string;
  variables: string[];
  filters_by_type: boolean;
  /** what the codes in `type_codes` are — null when the event cannot filter */
  filter_kind: WorkflowTriggerFilterKind | null;
}

export type WorkflowTriggerFilterKind = "request_type" | "lead_status";

export type WorkflowStartStatus = "pending" | "sending" | "started" | "dead";

export interface WorkflowTriggerRow {
  id: string;
  name: string;
  event_key: string;
  type_codes: string[];
  channel_id: string;
  organization_id: string;
  workspace_id: string;
  has_channel_key: boolean;
  active: boolean;
  last_start: {
    status: WorkflowStartStatus;
    created_at: string;
    last_error: string | null;
  } | null;
  created_at: string;
  created_by: string;
}

export interface WorkflowStartRow {
  id: string;
  event_key: string;
  resource_type: string;
  resource_id: string;
  variables: Record<string, unknown>;
  status: WorkflowStartStatus;
  attempts: number;
  last_status_code: number | null;
  last_error: string | null;
  instance_id: string | null;
  workflow_key: string | null;
  next_attempt_at: string;
  started_at: string | null;
  created_at: string;
}

export interface WorkflowTriggerPayload {
  name: string;
  event_key: string;
  type_codes: string[];
  channel_id: string;
  /** required on create; on update only to replace the key */
  channel_key?: string;
  organization_id?: string;
  workspace_id?: string;
}

export async function listWorkflowTriggerEvents(): Promise<
  ClientResult<WorkflowTriggerEvent[]>
> {
  return adminApi<WorkflowTriggerEvent[]>("workflow-triggers/events");
}

export async function listWorkflowTriggers(): Promise<
  ClientResult<WorkflowTriggerRow[]>
> {
  return adminApi<WorkflowTriggerRow[]>("workflow-triggers");
}

export async function createWorkflowTrigger(
  payload: WorkflowTriggerPayload,
): Promise<ClientResult<WorkflowTriggerRow>> {
  return adminApi<WorkflowTriggerRow>("workflow-triggers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkflowTrigger(
  id: string,
  payload: Partial<WorkflowTriggerPayload> & { active?: boolean },
): Promise<ClientResult<WorkflowTriggerRow>> {
  return adminApi<WorkflowTriggerRow>(`workflow-triggers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listWorkflowStarts(
  id: string,
): Promise<ClientResult<WorkflowStartRow[]>> {
  return adminApi<WorkflowStartRow[]>(`workflow-triggers/${id}/starts`);
}

export async function retryWorkflowStart(
  id: string,
  startId: string,
): Promise<ClientResult<WorkflowStartRow>> {
  return adminApi<WorkflowStartRow>(
    `workflow-triggers/${id}/starts/${startId}/retry`,
    { method: "POST" },
  );
}

export async function testWorkflowTrigger(
  id: string,
): Promise<ClientResult<WorkflowStartRow>> {
  return adminApi<WorkflowStartRow>(`workflow-triggers/${id}/test`, {
    method: "POST",
  });
}

const workflowTriggers = {
  listWorkflowTriggerEvents,
  listWorkflowTriggers,
  createWorkflowTrigger,
  updateWorkflowTrigger,
  listWorkflowStarts,
  retryWorkflowStart,
  testWorkflowTrigger,
};

export default workflowTriggers;
