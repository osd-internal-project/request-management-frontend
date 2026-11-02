/**
 * ตารางทีม — งานของแต่ละบทบาทไปทีมไหน (`admin.org.manage`)
 *
 * Database: assignment_rules, assignment_role_settings, assignments
 * Services: core-service — `/admin/assignment-rules/*`
 *
 * OSD Workflow ถามตารางนี้ผ่าน external `POST process/assignments`.
 */

import { adminApi, type ClientResult } from "../client";

export interface AssignmentRoleSpec {
  key: string;
  label: string;
  fields: { key: string; label: string }[];
}

export interface AssignmentRule {
  id: string;
  role: string;
  name: string;
  org_unit_id: string;
  conditions: Record<string, string[]>;
  sort_order: number;
  active: boolean;
  updated_at: string;
}

export interface AssignmentRoleSetting {
  role: string;
  fallback_user_id: string | null;
  load_type_codes: string[];
}

export interface AssignmentHistoryRow {
  id: string;
  role: string;
  resource_type: string;
  resource_id: string;
  /** "Lead <ชื่อ>" หรือ "<type> <id>" — backend ประกอบให้ */
  resource_label: string;
  user_id: string;
  rule_id: string | null;
  org_unit_id: string | null;
  reason: string;
  created_at: string;
}

export interface AssignmentRulePayload {
  role: string;
  name: string;
  org_unit_id: string;
  conditions: Record<string, string[]>;
  sort_order: number;
}

export function listAssignmentRoles(): Promise<
  ClientResult<AssignmentRoleSpec[]>
> {
  return adminApi<AssignmentRoleSpec[]>("assignment-rules/roles");
}

export function listAssignmentRules(): Promise<
  ClientResult<{ rules: AssignmentRule[]; roles: AssignmentRoleSetting[] }>
> {
  return adminApi("assignment-rules");
}

export function createAssignmentRule(
  payload: AssignmentRulePayload,
): Promise<ClientResult<AssignmentRule>> {
  return adminApi<AssignmentRule>("assignment-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAssignmentRule(
  id: string,
  payload: Partial<Omit<AssignmentRulePayload, "role">> & { active?: boolean },
): Promise<ClientResult<AssignmentRule>> {
  return adminApi<AssignmentRule>(`assignment-rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAssignmentRole(
  role: string,
  payload: { fallback_user_id?: string | null; load_type_codes?: string[] },
): Promise<ClientResult<AssignmentRoleSetting>> {
  return adminApi<AssignmentRoleSetting>(`assignment-rules/roles/${role}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listAssignmentHistory(
  role: string,
): Promise<ClientResult<AssignmentHistoryRow[]>> {
  return adminApi<AssignmentHistoryRow[]>(
    `assignment-rules/history?role=${encodeURIComponent(role)}`,
  );
}

export function previewAssignment(
  role: string,
  criteria: Record<string, string>,
): Promise<
  ClientResult<{
    user_id: string;
    user_name: string;
    reason: string;
    rule_id: string | null;
  }>
> {
  return adminApi("assignment-rules/preview", {
    method: "POST",
    body: JSON.stringify({ role, criteria }),
  });
}
