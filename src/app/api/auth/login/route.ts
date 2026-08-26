import { NextRequest, NextResponse } from "next/server";
import {
  authCookieOptions,
  BACKEND_PREFIX,
  PKCE_STATE_COOKIE,
  PKCE_TTL_SECONDS,
  PKCE_VERIFIER_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import { LOGIN_PATH } from "@/lib/routes";

interface AuthorizationResponse {
  authorize_url: string;
  state: string;
  code_verifier: string;
}

/**
 * PKCE leg 1 (AUTH-01).
 *
 * The browser hits this and gets redirected to Keycloak's own login page —
 * there is no password field anywhere in this application. The verifier and
 * state are parked in httpOnly cookies for the callback to match against.
 *
 * Keycloak's realm and client configuration stays entirely in the backend;
 * this route only forwards the URL the backend built.
 */
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const redirectUri = new URL("/api/auth/callback", request.url).toString();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`,
      { method: "POST" },
    );
  } catch {
    return NextResponse.redirect(
      new URL(`${LOGIN_PATH}?error=unreachable`, request.url),
    );
  }

  if (!backendResponse.ok) {
    return NextResponse.redirect(
      new URL(`${LOGIN_PATH}?error=authorize_failed`, request.url),
    );
  }

  const authorization = (await backendResponse.json()) as AuthorizationResponse;

  const response = NextResponse.redirect(authorization.authorize_url);
  response.cookies.set(
    PKCE_VERIFIER_COOKIE,
    authorization.code_verifier,
    authCookieOptions(PKCE_TTL_SECONDS),
  );
  response.cookies.set(
    PKCE_STATE_COOKIE,
    // Carry the post-login destination alongside the CSRF state so the
    // callback can send the user where they were originally headed.
    `${authorization.state}|${from ?? ""}`,
    authCookieOptions(PKCE_TTL_SECONDS),
  );

  return response;
}
