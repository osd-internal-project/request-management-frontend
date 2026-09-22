import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/app-origin";
import { AUTH_LOGIN_PATH, RECONNECT_PATH } from "@/lib/routes";

/** Marks a login attempt that is already the automatic second try. */
export const RETRY_PARAM = "retry";

/**
 * The one failure a repeat trip cannot clear: the BFF's `fetch` threw, so the
 * backend — and with it Keycloak — is not answering at all.
 */
export const UNREACHABLE = "unreachable";

/** Stops the bouncing and shows the user why, with a retry they control. */
export function reconnectRedirect(
  request: NextRequest,
  reason: string,
  from?: string | null,
) {
  const url = new URL(RECONNECT_PATH, appOrigin(request));
  url.searchParams.set("error", reason);
  if (from) url.searchParams.set("from", from);

  return NextResponse.redirect(url);
}

/** Straight back through PKCE leg 1, flagged so the next failure is the last. */
export function loginRedirect(
  request: NextRequest,
  from?: string | null,
  retry = false,
) {
  const url = new URL(AUTH_LOGIN_PATH, appOrigin(request));
  if (from) url.searchParams.set("from", from);
  if (retry) url.searchParams.set(RETRY_PARAM, "1");

  return NextResponse.redirect(url);
}

/**
 * Where a failed login attempt sends the browser.
 *
 * Most failures are worth one silent retry — a stale PKCE cookie, a state that
 * aged out, a cancelled prompt — because the user has no login page of ours to
 * fall back to and Keycloak may well succeed on the second pass.
 *
 * The retry happens **once**. Without that cap an error that reproduces every
 * time (a misconfigured realm, a user who cancels again) would bounce the
 * browser between here and Keycloak until it gives up with
 * ERR_TOO_MANY_REDIRECTS and shows nothing at all.
 */
export function loginFailureRedirect(
  request: NextRequest,
  reason: string,
  options: { retried: boolean; from?: string | null },
) {
  if (reason === UNREACHABLE || options.retried) {
    return reconnectRedirect(request, reason, options.from);
  }

  return loginRedirect(request, options.from, true);
}
