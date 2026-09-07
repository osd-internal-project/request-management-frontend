/**
 * The session shape, and the two pure questions asked of it.
 *
 * Split out of `session.ts` on 4 ก.ย. 2569, when the row buttons on
 * งานค้างของฉัน needed `can()` from a client component. That file imports
 * `next/headers`, which exists only in a Server Component, so the build failed
 * at the *import* rather than at any call. Nothing here touches a request, so
 * both sides may read it.
 */

/** The §11.2 `GET /auth/me` payload. */
export interface Session {
  user: {
    id: string;
    username: string;
    display_name: string;
    email: string | null;
    org_unit_id: string | null;
    supervisor_user_id: string | null;
    /** AUTH-04: signed in, but an admin has not placed them in the org chart. */
    pending_org_assignment: boolean;
  };
  companies: {
    id: string;
    name: string;
    doc_prefix: string;
    is_primary: boolean;
  }[];
  active_company_id: string;
  roles: string[];
  permissions: string[];
  /**
   * Whether this person heads any group. Gates the "งานทั้งหมด" screen in the
   * menu — a page that can only ever be empty reads as one that failed.
   */
  leads_units: boolean;
  sensitive_fields_visible: string[];
}

/**
 * Permission check for composing the UI.
 *
 * Hiding a menu item is a convenience, never the control — the backend
 * re-checks the same permission on every call, so a hand-typed URL gets a 403
 * regardless of what the menu showed.
 */
export function can(session: Session | null, permission: string): boolean {
  return session?.permissions.includes(permission) ?? false;
}

export function canAny(
  session: Session | null,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => can(session, permission));
}
