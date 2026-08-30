import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/backend";
import { HOME_PATH, LOGIN_PATH } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith(LOGIN_PATH);

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
