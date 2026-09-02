/**
 * Organization Units API
 * 
 * Database: org_units, org_members
 * Services: user-service
 */

import { apiGet, type ApiResult } from "../core";
import {
  type OrgUnitNode,
  type OrgUnitShape,
  type OrgMember,
  type UnassignedUser,
} from "../types";

/** Get the organization unit tree */
export async function getOrgUnits(): Promise<ApiResult<OrgUnitNode[]>> {
  return apiGet<OrgUnitNode[]>("/admin/org-units");
}

/**
 * The chart's shape, readable by anyone who may read the directory.
 *
 * The submit screen offers a receiving team as a tree and narrows the receiver
 * list to that team and everything under it, and `getOrgUnits` above is
 * admin-only — calling it from there would be a guaranteed 403. This carries
 * no manager name and no member count, which is the difference.
 */
export async function getOrgUnitShapes(): Promise<ApiResult<OrgUnitShape[]>> {
  return apiGet<OrgUnitShape[]>("/org-units");
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
  getOrgUnitShapes,
  getOrgUnitMembers,
  getUnassignedUsers,
};

export default orgUnitsApi;
