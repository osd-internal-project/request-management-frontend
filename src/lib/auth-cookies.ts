import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  authCookieOptions,
  COMPANY_COOKIE,
  REFRESH_COOKIE,
  SESSION_IDLE_TIMEOUT_SECONDS,
} from "./backend";

/** The token payload both `/auth/callback` and `/auth/refresh` return (§11.2). */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

/**
 * Writes the session cookies, capped at the idle timeout (AUTH-02).
 *
 * The cap matters most for the refresh token: Keycloak hands out one measured
 * in hours or days, and left at that length the proxy would happily renew a
 * session for a machine abandoned overnight — precisely what an idle timeout
 * exists to prevent. The access cookie is capped for the same reason, though
 * `expires_in` is normally the shorter of the two anyway.
 *
 * Called from exactly two places, and it has to write identical options in
 * both: a second hand-written copy is where the cap would be forgotten on the
 * next change.
 */
export function setSessionCookies(
  response: NextResponse,
  tokens: TokenResponse,
): void {
  response.cookies.set(
    AUTH_COOKIE,
    tokens.access_token,
    authCookieOptions(
      Math.min(tokens.expires_in, SESSION_IDLE_TIMEOUT_SECONDS),
    ),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    authCookieOptions(
      Math.min(tokens.refresh_expires_in, SESSION_IDLE_TIMEOUT_SECONDS),
    ),
  );
}

/**
 * Drops every cookie belonging to the session.
 *
 * The company choice goes with them: it belongs to the session that made it,
 * and leaving it behind would start the next sign-in on this browser in
 * someone else's company.
 */
export function clearSessionCookies(response: NextResponse): NextResponse {
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(COMPANY_COOKIE);

  return response;
}
