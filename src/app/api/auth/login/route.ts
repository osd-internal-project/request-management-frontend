import { NextRequest, NextResponse } from "next/server";
import {
  authCookieOptions,
  BACKEND_PREFIX,
  PKCE_STATE_COOKIE,
  PKCE_TTL_SECONDS,
  PKCE_VERIFIER_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";
import {
  loginFailureRedirect,
  reconnectRedirect,
  RETRY_PARAM,
  UNREACHABLE,
} from "@/lib/auth-redirects";

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
 *
 * Every unauthenticated request in the application ends up here — there is no
 * login page of ours to land on any more. The only way out that is not
 * Keycloak is `/login/reconnect`, and only when the backend cannot be reached.
 */
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const retried = request.nextUrl.searchParams.get(RETRY_PARAM) === "1";
  const redirectUri = new URL("/api/auth/callback", request.url).toString();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`,
      { method: "POST" },
    );
  } catch {
    return reconnectRedirect(request, UNREACHABLE, from);
  }

  if (!backendResponse.ok) {
    return loginFailureRedirect(request, "authorize_failed", { retried, from });
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
    // callback can send the user where they were originally headed. The third
    // field is the retry flag: Keycloak hands back only `code` and `state`, so
    // this cookie is the only way leg 2 can tell a first attempt from the
    // automatic second one and stop retrying.
    `${authorization.state}|${from ?? ""}|${retried ? "1" : ""}`,
    authCookieOptions(PKCE_TTL_SECONDS),
  );

  return response;
}
