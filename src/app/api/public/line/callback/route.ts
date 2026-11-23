import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/app-origin";
import { backendUrl } from "@/lib/backend";
import { allow, clientAddress } from "@/lib/public/rate-limit";
import { ROUTES } from "@/lib/routes";

const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;
/** What LINE Login sends back; anything else is dropped before core-service. */
const FORWARDED = ["code", "state", "error", "friendship_status_changed"];

/**
 * LINE Login redirects the browser here after a user links their LINE. The
 * signed `state` is the credential (core-service checks it), so there is no
 * session; the answer is always a redirect to LINE ของฉัน with
 * `?line=ok` or the reason it failed.
 */
export async function GET(request: NextRequest) {
  const back = (result: string) =>
    NextResponse.redirect(
      new URL(
        `${ROUTES.myLine}?line=${encodeURIComponent(result)}`,
        appOrigin(request),
      ),
    );

  if (!allow(`line:${clientAddress(request.headers)}`, LIMIT, WINDOW_MS)) {
    return back("UNAVAILABLE");
  }
  const query = new URLSearchParams();
  for (const name of FORWARDED) {
    const value = request.nextUrl.searchParams.get(name);
    if (value) query.set(name, value.slice(0, 2000));
  }
  const response = await fetch(
    backendUrl(`/notifications/line/callback?${query.toString()}`),
    { cache: "no-store" },
  ).catch(() => null);
  const body = (await response?.json().catch(() => null)) as {
    ok?: boolean;
    reason?: string;
  } | null;
  if (!response?.ok || !body) return back("UNAVAILABLE");
  return back(body.ok ? "ok" : (body.reason ?? "LINE_ERROR"));
}
