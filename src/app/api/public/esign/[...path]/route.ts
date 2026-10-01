import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";
import { allow, clientAddress } from "@/lib/public/rate-limit";
import { messages } from "@/lib/messages";

/** CD-14 — requests per address per window, across all signing calls. */
const LIMIT = 60;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * The only paths a browser without a session may reach: a signer's link
 * (`public/<token>` and its steps) and the verification page
 * (`verify/<code>`). Anything else is refused here, before core-service.
 */
const ALLOWED = [
  /^public\/[A-Za-z0-9_-]{20,64}(\/(code|verify|document|sign|decline))?$/,
  /^verify\/[A-Za-z0-9-]{4,20}(\/check)?$/,
];

/**
 * CD-14 — the signing link and the verification page talk to core-service's
 * public e-sign routes through here: no session, the address rate-limited and
 * passed on (for the evidence page), the PDF streamed through untouched.
 */
async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (!ALLOWED.some((pattern) => pattern.test(path))) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: messages.esign.public.invalidLink },
      { status: 404 },
    );
  }
  const address = clientAddress(request.headers);
  if (!allow(`esign:${address}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { code: "TOO_MANY_REQUESTS", message: messages.esign.public.tooMany },
      { status: 429 },
    );
  }
  const response = await fetch(backendUrl(`/esign/${path}`), {
    method: request.method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": address,
      "user-agent": request.headers.get("user-agent") ?? "",
    },
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!response) {
    return NextResponse.json(
      { code: "UNAVAILABLE", message: messages.esign.public.unavailable },
      { status: 503 },
    );
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
