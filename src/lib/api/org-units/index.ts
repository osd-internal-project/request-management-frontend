/**
 * Organization Units API
 * 
 * Database: org_units, org_members
 * Services: user-service
 */

import { apiGet, type ApiResult } from "../core";
import {
  type OrgUnitNode,
  type OrgMember,
  type UnassignedUser,
} from "../types";

/** Get the organization unit tree */
export async function getOrgUnits(): Promise<ApiResult<OrgUnitNode[]>> {
  return apiGet<OrgUnitNode[]>("/admin/org-units");
}

/** Get members of a specific organization unit */
export async function getOrgUnitMembers(
  unitId: string,
): Promise<ApiResult<OrgMember[]>> {
  return apiGet<OrgMember[]>(`/admin/org-units/${unitId}/members`);
}

/** Get users not assigned to any organization unit */
export async function getUnassignedUsers(): Promise<
  ApiResult<UnassignedUser[]>
> {
  return apiGet<UnassignedUser[]>("/admin/users/unassigned");
}

/** Grouped for `import orgUnitsApi from …` at call sites. */
const orgUnitsApi = {
  getOrgUnits,
  getOrgUnitMembers,
  getUnassignedUsers,
};

export default orgUnitsApi;
