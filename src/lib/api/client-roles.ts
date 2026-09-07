/**
 * Writes screen A4 and its neighbouring tabs make.
 *
 * Through the BFF (`adminApi`) rather than `core.ts`: every one of these is a
 * click in the browser, and `core.ts` reads the session cookie with
 * `next/headers`, which only exists on the server.
 */
import { adminApi, appApi, type ClientResult } from "./client";
import type {
  AuditLogRow,
  HolidayCalendarRow,
  KeycloakRoleMappingRow,
  Paginated,
  RoleHolder,
  OrgUnitNode,
  RoleRow,
  ScopeRuleRow,
} from "./types";

export function createRole(input: {
  code: string;
  name: string;
  description?: string;
  permissions: string[];
  visibility_level?: OrgUnitNode["kind"];
  company_id?: string;
}): Promise<ClientResult<RoleRow>> {
  return adminApi<RoleRow>("roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * `permissions` replaces the whole set — the API takes it wholesale, so send
 * every permission the role should end up with, not a delta.
 *
 * `visibility_level` is the other way round: omit it to leave the level as it
 * is, send `null` to clear it. A caller that always sent the field would take
 * the level away from every role it saved without showing one.
 *
 * A set that pairs `admin.*` with `approval.decide` or
 * `request.sensitive.read` is refused with 422 (§5.4 guardrail 1). The screen
 * disables those boxes, but the rule lives in the backend: hiding a control is
 * a convenience, not a control (§3).
 */
export function updateRole(
  id: string,
  input: {
    name?: string;
    description?: string;
    permissions?: string[];
    visibility_level?: OrgUnitNode["kind"] | null;
    active?: boolean;
  },
): Promise<ClientResult<RoleRow>> {
  return adminApi<RoleRow>(`roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** ROLE-02 — the emergency hand-binding, audited like every other grant. */
export function grantRole(
  userId: string,
  input: { role_id: string; company_id: string },
): Promise<ClientResult<void>> {
  return adminApi<void>(`users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeRole(
  userId: string,
  roleId: string,
): Promise<ClientResult<void>> {
  return adminApi<void>(`users/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });
}

/**
 * SUP-01 — the company's working window and holidays.
 *
 * Replaces the whole calendar rather than patching fields: the screen shows
 * one form and saves it whole, and a holiday removed from the list has to
 * actually disappear.
 */
export function replaceHolidayCalendar(
  companyId: string,
  input: {
    workday_start_minute: number;
    workday_end_minute: number;
    working_weekdays: number[];
    holidays: string[];
  },
): Promise<ClientResult<HolidayCalendarRow>> {
  return adminApi<HolidayCalendarRow>(`holiday-calendars/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** SCOPE-01 — the whole table at once, like the SLA screen (SUP-01). */
export function replaceScopeRules(input: {
  rules: { role_id: string; resource: string; scope: string }[];
}): Promise<ClientResult<ScopeRuleRow[]>> {
  return adminApi<ScopeRuleRow[]>("scope-rules", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * ROLE-03 — replacing the table changes what the *next* login resolves to.
 *
 * `company_id` sits at the top level, not on each entry: the whole table for
 * one company is replaced at once, so a mapping left out of `mappings` is a
 * mapping removed.
 */
export function replaceKeycloakMappings(input: {
  company_id: string;
  mappings: { keycloak_role: string; role_id: string }[];
}): Promise<ClientResult<KeycloakRoleMappingRow[]>> {
  return adminApi<KeycloakRoleMappingRow[]>("keycloak-role-mappings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** What one name sync changed — mirrors `KeycloakNameSyncReport`. */
export interface KeycloakNameSyncReport {
  linked: string[];
  renamed: { from: string; to: string }[];
  missing: string[];
  checked: number;
}

/**
 * Re-reads the realm and corrects any mapping whose role was renamed there.
 *
 * One way: the realm decides the names, this system decides the permissions.
 * A rename used to go unnoticed until everyone holding that role silently lost
 * it at their next sign-in.
 */
export function syncKeycloakMappingNames(
  companyId: string,
): Promise<ClientResult<KeycloakNameSyncReport>> {
  return adminApi<KeycloakNameSyncReport>(
    `keycloak-role-mappings/sync-names?company_id=${encodeURIComponent(companyId)}`,
    { method: "POST" },
  );
}

/**
 * Screen A4 loads a role's holders and its recent changes on click.
 *
 * Read from the client rather than handed down from the page: passing a
 * loader function as a prop would put a function across the server→client
 * boundary, which fails at serialisation — the same fault that took the
 * bottleneck screen down (see `bottleneck-table.tsx`).
 */
export function fetchRoleHolders(
  roleId: string,
): Promise<ClientResult<RoleHolder[]>> {
  return adminApi<RoleHolder[]>(`roles/${roleId}/users`);
}

/** The last few audit entries for one role — §16 A4's `การเปลี่ยนแปลงล่าสุด`. */
export function fetchRoleAudit(
  roleId: string,
  limit = 3,
): Promise<ClientResult<Paginated<AuditLogRow>>> {
  const query = new URLSearchParams({
    resource_type: "role",
    resource_id: roleId,
    page: "1",
    page_size: String(limit),
  });

  // `appApi`, not `adminApi`: the audit route is `/audit-logs` at the root
  // (§11.7), and `adminApi` would prefix it into `/admin/audit-logs`, which
  // does not exist on either service.
  return appApi<Paginated<AuditLogRow>>(`audit-logs?${query.toString()}`);
}

/**
 * People an admin can hand-bind to a role — §16 A4's `+ ผูกมือ` dialog.
 *
 * Uses the existing `GET /users`, which is already scope-filtered: an admin
 * only ever sees, and so can only ever bind, someone inside their own reach.
 */
export function searchUsers(
  q: string,
): Promise<ClientResult<Paginated<{ id: string; username: string; displayName: string }>>> {
  const query = new URLSearchParams({ page: "1", page_size: "20" });
  if (q.trim()) query.set("q", q.trim());

  return appApi<
    Paginated<{ id: string; username: string; displayName: string }>
  >(`users?${query.toString()}`);
}
