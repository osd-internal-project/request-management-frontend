import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/backend";
import { HOME_PATH, LOGIN_PATH } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith(LOGIN_PATH);

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
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
