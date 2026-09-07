/**
 * Saving which groups and people may see whose work — screen A4's
 * "ขอบเขตข้อมูล" pane.
 *
 * Through the BFF (`adminApi`) rather than `core.ts`: this runs from a click,
 * and `core.ts` reads the session cookie with `next/headers`, which exists
 * only on the server.
 */

import { adminApi, type ClientResult } from "./client";
import type { OrgUnitScopeRow } from "./types";

/**
 * One row of the list the pane edits.
 *
 * Exactly one of the two target fields is set. Kept as two optionals rather
 * than a discriminated union because it is the shape the API takes and the
 * shape the database stores — a third one in the middle is a third thing to
 * keep in step.
 */
export interface OrgUnitScopeInput {
  target_org_unit_id?: string;
  target_user_id?: string;
  include_descendants: boolean;
  can_act: boolean;
}

/** Which kind of thing a grant is written to. */
export type ScopeViewerKind = "unit" | "user";

/*
  Two paths rather than one taking a kind: the ids come from different tables,
  and a route that resolved either would answer 404 for a real user id that
  simply was not a unit id — which reads as "no such person".
*/
function scopePath(kind: ScopeViewerKind, viewerId: string): string {
  return kind === "unit"
    ? `org-units/${viewerId}/scopes`
    : `users/${viewerId}/scopes`;
}

/**
 * Replaces every grant held by one group or one person.
 *
 * A replace, not an add: the pane edits a list and saves it, and two calls
 * each applying half of an edit is how a removed grant survives.
 */
export async function replaceScopes(
  kind: ScopeViewerKind,
  viewerId: string,
  scopes: OrgUnitScopeInput[],
): Promise<ClientResult<OrgUnitScopeRow[]>> {
  return adminApi<OrgUnitScopeRow[]>(scopePath(kind, viewerId), {
    method: "PUT",
    body: JSON.stringify({ scopes }),
  });
}

/** Re-reads one viewer's grants when the pane selects it. */
export async function fetchScopes(
  kind: ScopeViewerKind,
  viewerId: string,
): Promise<ClientResult<OrgUnitScopeRow[]>> {
  return adminApi<OrgUnitScopeRow[]>(scopePath(kind, viewerId));
}
