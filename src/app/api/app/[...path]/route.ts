import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  backendUrl,
  COMPANY_COOKIE,
  companyHeader,
} from "@/lib/backend";

/**
 * BFF proxy for the non-admin API — approvals, notifications, requests.
 *
 * Same contract as the admin proxy: the access token lives in an httpOnly
 * cookie a client component cannot read, so the call is forwarded server-side
 * with the token attached and the browser never holds a credential.
 *
 * A dumb pipe on purpose — it grants nothing. Every request still hits
 * `PolicyGuard` on the backend, which checks permission and company. Widening
 * what the UI can call does not widen what it may do.
 */
async function forward(
  request: NextRequest,
  path: string[],
  method: string,
): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "ต้องเข้าสู่ระบบก่อนใช้งาน" },
      { status: 401 },
    );
  }

  const search = request.nextUrl.search;
  const suffix = `/${path.join("/")}`;
  const url = `${backendUrl(suffix)}${search}`;

  // Multipart (attachment upload) passes through as bytes with its boundary intact.
  const incomingType = request.headers.get("content-type") ?? "";
  const isMultipart = incomingType.startsWith("multipart/form-data");
  const body =
    method === "GET" || method === "DELETE"
      ? undefined
      : isMultipart
        ? await request.arrayBuffer()
        : await request.text();
  const contentType = isMultipart ? incomingType : "application/json";

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        // The company travels from the cookie, never from a client-supplied
        // header: a page script could otherwise name any company it liked.
        // `CompanyGuard` still rejects one the user is not a member of.
        ...companyHeader(request.cookies.get(COMPANY_COOKIE)?.value),
        ...(body ? { "Content-Type": contentType } : {}),
        // A money action is retried safely only if the backend sees the same key twice.
        ...idempotencyHeader(request.headers.get("idempotency-key")),
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { code: "UNKNOWN", message: "ไม่สามารถติดต่อระบบได้" },
      { status: 502 },
    );
  }

  // 204 carries no body; parsing it would throw.
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  // A file download streams through with its own type and filename.
  const responseType = response.headers.get("content-type") ?? "";
  if (response.ok && !responseType.includes("application/json")) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: pickHeaders(response.headers, [
        "content-type",
        "content-length",
        "content-disposition",
      ]),
    });
  }

  const text = await response.text();
  return new NextResponse(text || null, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

function pickHeaders(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value) picked.set(name, value);
  }
  return picked;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path, "DELETE");
}

function idempotencyHeader(key: string | null): Record<string, string> {
  return key && /^[\w-]{8,100}$/.test(key) ? { "Idempotency-Key": key } : {};
}
