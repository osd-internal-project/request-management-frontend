import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";
import { allow, clientAddress } from "@/lib/public/rate-limit";
import { messages } from "@/lib/messages";

/** CD-248 — requests per address per window, read and answer together. */
const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * CD-248 — the customer's survey link talks to core-service's public survey
 * routes through here: no session, the address rate-limited, nothing but a
 * well-formed token passed on.
 */
async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const m = messages.service.assets.surveys.public;
  const { token } = await params;
  if (!TOKEN.test(token)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: m.invalid },
      { status: 404 },
    );
  }
  if (!allow(`survey:${clientAddress(request.headers)}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { code: "TOO_MANY_REQUESTS", message: m.tooMany },
      { status: 429 },
    );
  }
  const response = await fetch(backendUrl(`/service-surveys/public/${token}`), {
    method: request.method,
    headers: { "content-type": "application/json" },
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!response) {
    return NextResponse.json(
      { code: "UNAVAILABLE", message: m.unavailable },
      { status: 503 },
    );
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}

export const GET = forward;
export const POST = forward;
