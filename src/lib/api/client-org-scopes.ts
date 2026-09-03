/**
 * Saving which groups a group may see — screen A4's "ขอบเขตข้อมูล" pane.
 *
 * Through the BFF (`adminApi`) rather than `core.ts`: this runs from a click,
 * and `core.ts` reads the session cookie with `next/headers`, which exists
 * only on the server.
 */

import { adminApi, type ClientResult } from "./client";
import type { OrgUnitScopeRow } from "./types";

/** One row of the list the pane edits. */
export interface OrgUnitScopeInput {
  target_org_unit_id: string;
  include_descendants: boolean;
  can_act: boolean;
}

/**
 * Replaces every grant held by one group.
 *
 * A replace, not an add: the pane edits a list and saves it, and two calls
 * each applying half of an edit is how a removed grant survives.
 */
export async function replaceOrgUnitScopes(
  unitId: string,
  scopes: OrgUnitScopeInput[],
): Promise<ClientResult<OrgUnitScopeRow[]>> {
  return adminApi<OrgUnitScopeRow[]>(`org-units/${unitId}/scopes`, {
    method: "PUT",
    body: JSON.stringify({ scopes }),
  });
}

/** Re-reads one group's grants after a save elsewhere on the screen. */
export async function fetchOrgUnitScopes(
  unitId: string,
): Promise<ClientResult<OrgUnitScopeRow[]>> {
  return adminApi<OrgUnitScopeRow[]>(`org-units/${unitId}/scopes`);
}
