/**
 * The tabs of `ผังทีมและสิทธิ์` (§16 A3 + A4).
 *
 * **Scope Rules is hidden (31 Aug 2026).** The scope levels it edited were
 * withdrawn — visibility now follows involvement and who heads a group, see
 * `libs/share/src/access/access-rules.ts` — so the screen configures nothing.
 * Hidden rather than deleted: `scope-rules-admin.tsx`, `GET/PUT
 * /admin/scope-rules` and the `scope_rules` table all remain, so bringing it
 * back is adding the key to this list again.
 *
 * Kept in a plain module rather than beside the component: the component is
 * `"use client"`, and a value exported from a client module and imported by a
 * server component arrives as a client *reference*, not the array itself —
 * calling `.includes` on it throws at render time. Only the component crossing
 * that boundary is a real export; constants have to live outside it.
 */
export const ORG_TAB_KEYS = ["tree", "roles", "keycloak"] as const;

export type OrgTabKey = (typeof ORG_TAB_KEYS)[number];

/** Narrows `?tab=` to a known tab, falling back to the org chart. */
export function toOrgTab(value: string | undefined): OrgTabKey {
  return (ORG_TAB_KEYS as readonly string[]).includes(value ?? "")
    ? (value as OrgTabKey)
    : "tree";
}
