import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";
import { allow, clientAddress } from "@/lib/public/rate-limit";
import { messages } from "@/lib/messages";

/** CD-249 — requests per address per window, across the portal. */
const LIMIT = 120;
const WINDOW_MS = 10 * 60 * 1000;
const COOKIE = "ctd_portal";
const SESSION_HOURS = 8;

/** The only portal paths a browser may reach; anything else stops here. */
const ALLOWED = [
  /^session$/,
  /^logout$/,
  /^(me|assets|covers|jobs|reports)$/,
  /^reports\/[0-9a-f-]{36}\/pdf$/,
];

/**
 * CD-249 — the Customer Portal talks to core-service's public portal routes
 * through here: the session token lives in an httpOnly cookie set when the
 * invite link is opened, and is passed on as `x-portal-session`; the address
 * is rate-limited; nothing but the allowed paths goes through.
 */
async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const m = messages.service.assets.portal.public;
  const path = (await params).path.join("/");
  if (!ALLOWED.some((pattern) => pattern.test(path))) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: m.invalid },
      { status: 404 },
    );
  }
  if (!allow(`portal:${clientAddress(request.headers)}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { code: "TOO_MANY_REQUESTS", message: m.tooMany },
      { status: 429 },
    );
  }
  const session = request.cookies.get(COOKIE)?.value;
  const response = await fetch(backendUrl(`/service-portal/public/${path}`), {
    method: request.method,
    headers: {
      "content-type": "application/json",
      ...(session ? { "x-portal-session": session } : {}),
    },
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!response) {
    return NextResponse.json(
      { code: "UNAVAILABLE", message: m.unavailable },
      { status: 503 },
    );
  }

  // the invite opened a session: keep its token where scripts cannot read it
  if (path === "session" && response.ok) {
    const body = (await response.json()) as { session: string };
    const out = NextResponse.json({ ok: true });
    out.cookies.set(COOKIE, body.session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_HOURS * 3600,
    });
    return out;
  }
  if (path === "logout") {
    const out = NextResponse.json({ ok: true });
    out.cookies.delete(COOKIE);
    return out;
  }
  const type = response.headers.get("content-type") ?? "application/json";
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type": type,
      ...(type.includes("pdf")
        ? {
            "content-disposition":
              response.headers.get("content-disposition") ?? "inline",
            "cache-control": "no-store",
          }
        : {}),
    },
  });
}

export const GET = forward;
export const POST = forward;
