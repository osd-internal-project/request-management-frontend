import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/backend";
import { HOME_PATH, LOGIN_PATH } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const canRenew = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith(LOGIN_PATH);

  /**
   * AUTH-02: the access cookie has lapsed but the refresh cookie has not, so
   * this is a live session whose token simply aged out between navigations.
   * Renewing here is what keeps the timeout honest without JavaScript: both
   * cookies are capped at the idle window, so a browser that sat untouched for
   * fifteen minutes arrives with neither and falls through to login below.
   */
  if (!isAuthenticated && canRenew && !isLoginPage) {
    const renewUrl = new URL("/api/auth/refresh", request.url);
    renewUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(renewUrl);
  }

  /**
   * Straight to Keycloak, not to `/login`.
   *
   * The old route sent everyone to a page whose only control was a button that
   * went here anyway — one extra click on the way to the identity provider that
   * owns the credentials. `/login` still exists for the states a redirect
   * cannot carry (an authorize failure, a completed logout); see the comment on
   * that page.
   *
   * `matcher` below excludes `/api`, so this redirect does not re-enter the
   * proxy and cannot loop.
   */
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/api/auth/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && (isLoginPage || pathname === "/")) {
    return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
