import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/app-origin";
import { AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/backend";
import {
  AUTH_LOGIN_PATH,
  HOME_PATH,
  LOGIN_PREFIX,
  RECONNECT_PATH,
} from "@/lib/routes";

export function proxy(request: NextRequest) {
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const canRenew = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  /**
   * The only page an unauthenticated browser may render — and an exact match,
   * not a prefix. `/login` itself no longer exists, so a stale link or bookmark
   * to it has to fall through to the redirect below rather than reach a 404.
   */
  const isReconnectPage = pathname === RECONNECT_PATH;

  /** A path under `/login` that is not the reconnect page: a dead link. */
  const isStaleLoginLink =
    !isReconnectPage &&
    (pathname === LOGIN_PREFIX || pathname.startsWith(`${LOGIN_PREFIX}/`));

  /**
   * AUTH-02: the access cookie has lapsed but the refresh cookie has not, so
   * this is a live session whose token simply aged out between navigations.
   * Renewing here is what keeps the timeout honest without JavaScript: both
   * cookies are capped at the idle window, so a browser that sat untouched for
   * fifteen minutes arrives with neither and falls through to login below.
   */
  if (!isAuthenticated && canRenew && !isReconnectPage) {
    const renewUrl = new URL("/api/auth/refresh", appOrigin(request));
    renewUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(renewUrl);
  }

  /**
   * Straight to Keycloak. There is nowhere else to go.
   *
   * The application has no login page: the old one's only control was a button
   * that came here anyway, one extra click on the way to the identity provider
   * that owns the credentials. The single exception is `/login/reconnect`,
   * which is reached only when the BFF cannot talk to the backend at all — see
   * `lib/auth-redirects.ts`.
   *
   * `matcher` below excludes `/api`, so this redirect does not re-enter the
   * proxy and cannot loop.
   */
  if (!isAuthenticated && !isReconnectPage) {
    const loginUrl = new URL(AUTH_LOGIN_PATH, appOrigin(request));
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // A session already exists, so nothing under `/login` has anything to
  // offer — including the dead links, which would otherwise 404.
  if (
    isAuthenticated &&
    (isReconnectPage || isStaleLoginLink || pathname === "/")
  ) {
    return NextResponse.redirect(new URL(HOME_PATH, appOrigin(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
