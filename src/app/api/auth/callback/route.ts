import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  authCookieOptions,
  BACKEND_PREFIX,
  PKCE_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  REFRESH_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import { HOME_PATH, LOGIN_PATH } from "@/lib/routes";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

function failTo(request: NextRequest, reason: string) {
  const response = NextResponse.redirect(
    new URL(`${LOGIN_PATH}?error=${reason}`, request.url),
  );
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

  // Keycloak reports a refused login (bad credentials, cancelled consent) as
  // an error param rather than an HTTP failure.
  const error = request.nextUrl.searchParams.get("error");
  if (error) return failTo(request, error);

  const verifier = request.cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const storedState = request.cookies.get(PKCE_STATE_COOKIE)?.value;

  if (!code || !state || !verifier || !storedState) {
    return failTo(request, "missing_state");
  }

  const [expectedState, from] = storedState.split("|");

  // The CSRF check: a callback that did not originate from this browser's
  // leg 1 cannot know the state we stored.
  if (state !== expectedState) return failTo(request, "state_mismatch");

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        codeVerifier: verifier,
        redirectUri: new URL("/api/auth/callback", request.url).toString(),
      }),
    });
  } catch {
    return failTo(request, "unreachable");
  }

  if (!backendResponse.ok) return failTo(request, "exchange_failed");

  const tokens = (await backendResponse.json()) as TokenResponse;

  const destination = from && from.startsWith("/") ? from : HOME_PATH;
  const response = NextResponse.redirect(new URL(destination, request.url));

  response.cookies.set(
    AUTH_COOKIE,
    tokens.access_token,
    authCookieOptions(tokens.expires_in),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    authCookieOptions(tokens.refresh_expires_in),
  );
  response.cookies.delete(PKCE_VERIFIER_COOKIE);
  response.cookies.delete(PKCE_STATE_COOKIE);

  return response;
}
