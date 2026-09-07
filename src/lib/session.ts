import { cookies } from "next/headers";
import type { Session } from "./session-shape";
import {
  AUTH_COOKIE,
  BACKEND_PREFIX,
  COMPANY_COOKIE,
  companyHeader,
  USER_SERVICE_URL,
} from "./backend";


/**
 * Reads the signed-in user's identity and permissions.
 *
 * Server-side only, and called once per render rather than per component —
 * ROLE-06 has the frontend fetch this once after login and compose the menu
 * from it. Returns null when there is no usable session, so callers redirect
 * rather than render a half-broken shell.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const selected = store.get(COMPANY_COOKIE)?.value;

  // The header matters here as much as on any other call: roles, scopes, and
  // visible sensitive fields are resolved per company (ROLE-04), so asking
  // without it would compose the menu from the wrong company's permissions.
  const session = await fetchMe(token, selected);

  /**
   * A selected company the backend refuses — membership removed while the
   * session was open. Retrying without the header falls back to the primary
   * company so the user gets a working app instead of `COMPANY_FORBIDDEN` on
   * every page; the caller clears the stale cookie.
   */
  if (!session && selected) return fetchMe(token, undefined);

  return session;
}

async function fetchMe(
  token: string,
  companyId: string | undefined,
): Promise<Session | null> {
  try {
    const response = await fetch(`${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...companyHeader(companyId),
      },
      // Identity must never come from a cache — a role revoked in Keycloak
      // has to disappear here within one token lifetime (ROLE-03).
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as Session;
  } catch {
    return null;
  }
}

/*
  Re-exported so every existing `from "@/lib/session"` keeps working. A client
  component must import from `./session-shape` directly — reaching them through
  here drags `next/headers` into the browser bundle.
*/
export { can, canAny } from "./session-shape";
export type { Session } from "./session-shape";
