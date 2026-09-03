/**
 * The tabs of `ผังทีมและสิทธิ์` (§16 A3 + A4).
 *
 * **`scope` edits again, but a different thing (2 ก.ย. 2569).**
 * It was hidden on 31 Aug 2026 when the own/team/department/company/all levels
 * were withdrawn — `libs/share/src/access/access-rules.ts` decides visibility
 * now — and hiding it left nobody able to answer "who can see what", which is
 * the question an administrator is asked most.
 *
 * The pane holds two halves. `GroupScopeAdmin` is editable and writes
 * `org_unit_scopes` through `GET/PUT /admin/org-units/:id/scopes`: which group
 * may see, and optionally work on, which other group's requests — the thing a
 * `(role, resource) → level` row could never express. `ScopeRulesAdmin` below
 * it stays read-only and states the rules that live in code.
 *
 * `GET/PUT /admin/scope-rules` and the `scope_rules` table still exist and are
 * still unread by any authorisation path.
 *
 * Kept in a plain module rather than beside the component: the component is
 * `"use client"`, and a value exported from a client module and imported by a
 * server component arrives as a client *reference*, not the array itself —
 * calling `.includes` on it throws at render time. Only the component crossing
 * that boundary is a real export; constants have to live outside it.
 */
export const ORG_TAB_KEYS = ["tree", "roles", "scope", "keycloak"] as const;

export type OrgTabKey = (typeof ORG_TAB_KEYS)[number];

/** Narrows `?tab=` to a known tab, falling back to the org chart. */
export function toOrgTab(value: string | undefined): OrgTabKey {
  return (ORG_TAB_KEYS as readonly string[]).includes(value ?? "")
    ? (value as OrgTabKey)
    : "tree";
}
