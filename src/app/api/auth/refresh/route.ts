import { NextRequest, NextResponse } from "next/server";
import { appOrigin, isSecureOrigin } from "@/lib/auth/app-origin";
import {
  clearSessionCookies,
  setSessionCookies,
  type TokenResponse,
} from "@/lib/auth/auth-cookies";
import {
  BACKEND_PREFIX,
  REFRESH_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import { HOME_PATH, LOGOUT_PATH } from "@/lib/routes";

/**
 * AUTH-02 silent renewal.
 *
 * The backend has had `POST /auth/refresh` since S1 and nothing ever called
 * it, so an expired access token meant a trip back through Keycloak. This is
 * the only place the refresh token is spent: `SessionKeeper` posts here every
 * few minutes, and `proxy.ts` sends a navigation here when the access cookie
 * has lapsed but the refresh cookie has not.
 *
 * The proxy's `matcher` excludes `/api`, so a redirect to this route cannot
 * re-enter the proxy and loop.
 */
async function renew(request: NextRequest): Promise<TokenResponse | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const response = await fetch(
      `${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      },
    );

    if (!response.ok) return null;

    return (await response.json()) as TokenResponse;
  } catch {
    // Backend unreachable. Treated as an expired session rather than retried:
    // the caller's next move — log out, or re-render — is the same either way.
    return null;
  }
}

/** Renewal for `SessionKeeper` and the 401 retry in `lib/api/client`. */
export async function POST(request: NextRequest) {
  const tokens = await renew(request);

  if (!tokens) {
    // The cookies have to go with the 401. Left in place, the proxy would keep
    // calling the browser authenticated and every navigation would land back
    // here for another refusal.
    return clearSessionCookies(
      NextResponse.json({ code: "SESSION_EXPIRED" }, { status: 401 }),
    );
  }

  const response = NextResponse.json({
    ok: true,
    expires_in: tokens.expires_in,
  });
  setSessionCookies(response, tokens, isSecureOrigin(request));

  return response;
}

/**
 * Renewal for a navigation the proxy caught mid-flight.
 *
 * This is the leg that survives JavaScript being broken or blocked: the user
 * clicks a link, the proxy notices the access cookie is gone, and the browser
 * comes here and back without the page ever noticing.
 */
export async function GET(request: NextRequest) {
  const tokens = await renew(request);

  if (!tokens) {
    // Through logout, not straight to /login: the cookies must be cleared and
    // the Keycloak session ended, or the proxy bounces the browser back here.
    return NextResponse.redirect(
      new URL(`${LOGOUT_PATH}?reason=session_expired`, appOrigin(request)),
    );
  }

  // Only a path of our own, never a URL an attacker put in the query string.
  // `//evil.com` starts with a slash and still resolves to another origin, so
  // a leading-slash test alone is not the check it looks like.
  const from = request.nextUrl.searchParams.get("from");
  const isLocalPath = Boolean(
    from && from.startsWith("/") && !from.startsWith("//"),
  );
  const destination = isLocalPath ? from! : HOME_PATH;

  const response = NextResponse.redirect(new URL(destination, appOrigin(request)));
  setSessionCookies(response, tokens, isSecureOrigin(request));

  return response;
}
