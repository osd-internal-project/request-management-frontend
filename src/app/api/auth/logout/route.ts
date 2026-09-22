import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/app-origin";
import { clearSessionCookies } from "@/lib/auth/auth-cookies";
import {
  BACKEND_PREFIX,
  REFRESH_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import { AUTH_LOGIN_PATH } from "@/lib/routes";

interface LogoutResponse {
  end_session_url?: string;
}

/**
 * AUTH-03 single logout.
 *
 * Clearing our cookies is not enough: the Keycloak SSO session would survive,
 * so the next login would skip the password prompt entirely — surprising on a
 * shared machine. So we revoke the refresh token *and* send the browser
 * through Keycloak's end-session endpoint.
 */
async function endSession(request: NextRequest): Promise<string | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as LogoutResponse;
    return body.end_session_url ?? null;
  } catch {
    // Best effort: the local cookies still get cleared below, so the user is
    // logged out here even when Keycloak is unreachable.
    return null;
  }
}

/**
 * Used by the avatar menu's plain link, so it must redirect rather than JSON.
 *
 * Also the escape hatch for a dead session: the shell sends the browser here
 * with `?reason=` when a cookie exists but `/auth/me` rejects it. Clearing the
 * cookies is what breaks the redirect loop — the proxy then stops treating the
 * request as authenticated, and the browser goes on to Keycloak instead of
 * bouncing back to `/pages`.
 *
 * There is no page of ours in between. Keycloak's end-session endpoint has
 * just killed the SSO session, so the login form it lands on is a real prompt,
 * not a silent sign-in. `?reason=` survives as context for the caller and for
 * the logs; it no longer picks the destination.
 */
export async function GET(request: NextRequest) {
  const endSessionUrl = await endSession(request);

  // Reached only when Keycloak could not be told to end the session — the
  // cookies below are still cleared, so this is a real logout either way.
  const fallback = new URL(AUTH_LOGIN_PATH, appOrigin(request)).toString();

  return clearSessionCookies(
    NextResponse.redirect(endSessionUrl ?? fallback),
  );
}

/** Programmatic logout — returns where to send the browser next. */
export async function POST(request: NextRequest) {
  const endSessionUrl = await endSession(request);

  return clearSessionCookies(
    NextResponse.json({ ok: true, end_session_url: endSessionUrl }),
  );
}
