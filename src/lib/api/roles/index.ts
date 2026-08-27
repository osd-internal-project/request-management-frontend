/**
 * Roles · permissions · scope rules · Keycloak mappings — screens A4 and the
 * two tabs beside it.
 *
 * Database: roles, role_permissions, user_roles, scope_rules,
 * keycloak_role_mappings
 * Services: user-service
 */

import { apiGet, type ApiResult } from "../core";
import type {
  KeycloakRoleMappingRow,
  PermissionRow,
  RoleHolder,
  RoleRow,
  ScopeRuleRow,
} from "../types";

/** §5.4 — the catalog is declared in code and read-only here. */
export async function getPermissions(): Promise<ApiResult<PermissionRow[]>> {
  return apiGet<PermissionRow[]>("/admin/permissions");
}

/**
 * Roles usable in the active company: its own plus group-wide templates.
 *
 * Each row carries `_count.users` for **this company** — the number screen A4
 * leads with, and the reason a role cannot be deleted (ROLE-02).
 */
export async function getRoles(): Promise<ApiResult<RoleRow[]>> {
  return apiGet<RoleRow[]>("/admin/roles");
}

/** Who holds one role here, with the badge that says where the grant came from. */
export async function getRoleHolders(
  roleId: string,
): Promise<ApiResult<RoleHolder[]>> {
  return apiGet<RoleHolder[]>(`/admin/roles/${roleId}/users`);
}

/** SCOPE-01 — takes effect immediately, no deploy (§5.4). */
export async function getScopeRules(): Promise<ApiResult<ScopeRuleRow[]>> {
  return apiGet<ScopeRuleRow[]>("/admin/scope-rules");
}

/** ROLE-03 — re-evaluated on every login and refresh. */
export async function getKeycloakRoleMappings(): Promise<
  ApiResult<KeycloakRoleMappingRow[]>
> {
  return apiGet<KeycloakRoleMappingRow[]>("/admin/keycloak-role-mappings");
}

/** Grouped for `import roles from …` at call sites. */
const roles = {
  getPermissions,
  getRoles,
  getRoleHolders,
  getScopeRules,
  getKeycloakRoleMappings,
};

export default roles;
