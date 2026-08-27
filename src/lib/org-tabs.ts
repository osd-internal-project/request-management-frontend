/**
 * The four tabs of `ผังทีมและสิทธิ์` (§16 A3 + A4).
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
