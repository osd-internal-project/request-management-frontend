import { NextRequest, NextResponse } from "next/server";
import { appOrigin, isSecureOrigin } from "@/lib/auth/app-origin";
import { setSessionCookies, type TokenResponse } from "@/lib/auth/auth-cookies";
import {
  BACKEND_PREFIX,
  PKCE_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import { loginFailureRedirect, UNREACHABLE } from "@/lib/auth/auth-redirects";
import { HOME_PATH } from "@/lib/routes";

interface LoginAttempt {
  /** The CSRF state leg 1 stored; absent when the cookie never arrived. */
  expectedState?: string;
  /** Where the user was headed before being sent to Keycloak. */
  from?: string;
  /** True when leg 1 was already the automatic retry, so this failure is final. */
  retried: boolean;
}

/** Unpacks the `state|from|retry` cookie leg 1 parked before the redirect. */
function readAttempt(request: NextRequest): LoginAttempt {
  const stored = request.cookies.get(PKCE_STATE_COOKIE)?.value;
  if (!stored) return { retried: false };

  const [expectedState, from, retry] = stored.split("|");

  return { expectedState, from: from || undefined, retried: retry === "1" };
}

/**
 * One more pass through Keycloak, or the reconnect page when that pass has
 * already been spent. The PKCE cookies go either way — leg 1 mints fresh ones,
 * and a stale verifier is exactly what produces `missing_state` next time.
 */
function failTo(request: NextRequest, reason: string, attempt: LoginAttempt) {
  const response = loginFailureRedirect(request, reason, {
    retried: attempt.retried,
    from: attempt.from,
  });
  response.cookies.delete(PKCE_VERIFIER_COOKIE);
  response.cookies.delete(PKCE_STATE_COOKIE);

  return response;
}

/**
 * PKCE leg 2 (AUTH-01).
 *
 * Keycloak sends the browser back here with a code. We check the state
 * against the cookie set in leg 1, then have the backend trade the code plus
 * verifier for tokens, which land in httpOnly cookies — the browser never
 * holds a token in JavaScript.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const attempt = readAttempt(request);

  // Keycloak reports a refused login (bad credentials, cancelled consent) as
  // an error param rather than an HTTP failure.
  const error = request.nextUrl.searchParams.get("error");
  if (error) return failTo(request, error, attempt);

  const verifier = request.cookies.get(PKCE_VERIFIER_COOKIE)?.value;

  if (!code || !state || !verifier || !attempt.expectedState) {
    return failTo(request, "missing_state", attempt);
  }

  // The CSRF check: a callback that did not originate from this browser's
  // leg 1 cannot know the state we stored.
  if (state !== attempt.expectedState) {
    return failTo(request, "state_mismatch", attempt);
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        codeVerifier: verifier,
        redirectUri: new URL("/api/auth/callback", appOrigin(request)).toString(),
      }),
    });
  } catch {
    return failTo(request, UNREACHABLE, attempt);
  }

  if (!backendResponse.ok) {
    return failTo(request, "exchange_failed", attempt);
  }

  const tokens = (await backendResponse.json()) as TokenResponse;

  // Only a path of our own: `//evil.com` starts with a slash and still resolves
  // to another origin, the same check `api/auth/refresh` makes.
  const { from } = attempt;
  const destination =
    from && from.startsWith("/") && !from.startsWith("//") ? from : HOME_PATH;
  const response = NextResponse.redirect(new URL(destination, appOrigin(request)));

  setSessionCookies(response, tokens, isSecureOrigin(request));
  response.cookies.delete(PKCE_VERIFIER_COOKIE);
  response.cookies.delete(PKCE_STATE_COOKIE);

  return response;
}
