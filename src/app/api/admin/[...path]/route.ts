import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  backendUrl,
  COMPANY_COOKIE,
  companyHeader,
} from "@/lib/backend";

/**
 * BFF proxy for the admin API.
 *
 * Client components on screen A3 need to write (assign an org unit, change a
 * team lead, grant a Keycloak role), but the access token lives in an httpOnly
 * cookie they cannot read. This forwards the call server-side with the token
 * attached, so the browser never holds a credential.
 *
 * It is a dumb pipe on purpose — it grants nothing. Every request still hits
 * `PolicyGuard` on the backend, which checks the caller's permission and
 * company. Widening what the UI can call does not widen what it may do.
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
  const suffix = `/admin/${path.join("/")}`;
  const url = `${backendUrl(suffix)}${search}`;

  const body =
    method === "GET" || method === "DELETE" ? undefined : await request.text();

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
        ...(body ? { "Content-Type": "application/json" } : {}),
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

  const text = await response.text();
  return new NextResponse(text || null, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
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
