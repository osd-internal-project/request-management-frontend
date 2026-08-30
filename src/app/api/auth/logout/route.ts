import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  BACKEND_PREFIX,
  COMPANY_COOKIE,
  REFRESH_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import { LOGIN_PATH } from "@/lib/routes";

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

function clearCookies(response: NextResponse): NextResponse {
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  // The company choice belongs to the session that made it — leaving it behind
  // would start the next sign-in on this browser in someone else's company.
  response.cookies.delete(COMPANY_COOKIE);
  return response;
}

/**
 * Used by the avatar menu's plain link, so it must redirect rather than JSON.
 *
 * Also the escape hatch for a dead session: the shell sends the browser here
 * with `?reason=` when a cookie exists but `/auth/me` rejects it. Clearing the
 * cookies is what breaks the redirect loop — the proxy then stops treating the
 * request as authenticated, so `/login` finally renders instead of bouncing
 * back to `/pages`.
 */
export async function GET(request: NextRequest) {
  const endSessionUrl = await endSession(request);
  const reason = request.nextUrl.searchParams.get("reason");

  const fallback = new URL(LOGIN_PATH, request.url);
  // `signed_out` is what stops `/login` bouncing the browser to Keycloak: the
  // realm session may well still be alive, and the user would be signed back in
  // before they saw anything. `reason` already renders for the same reason.
  if (reason) fallback.searchParams.set("error", reason);
  else fallback.searchParams.set("signed_out", "1");

  return clearCookies(
    NextResponse.redirect(endSessionUrl ?? fallback.toString()),
  );
}

/** Programmatic logout — returns where to send the browser next. */
export async function POST(request: NextRequest) {
  const endSessionUrl = await endSession(request);

  return clearCookies(
    NextResponse.json({ ok: true, end_session_url: endSessionUrl }),
  );
}
