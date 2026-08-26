import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  authCookieOptions,
  BACKEND_PREFIX,
  COMPANY_COOKIE,
  USER_SERVICE_URL,
} from "@/lib/backend";

/** How long a company choice survives. Matches the refresh token's ballpark. */
const COMPANY_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;

interface SwitchBody {
  company_id?: unknown;
}

/**
 * AUTH-05 — change the active company without signing in again.
 *
 * The backend is asked first and the cookie is written only if it agrees. That
 * ordering is the point: `POST /auth/switch-company` re-resolves roles, scopes,
 * and visible sensitive fields for the target company (ROLE-04) and answers
 * `COMPANY_FORBIDDEN` for one the user does not belong to. Writing the cookie
 * first would leave every later request carrying a company the backend refuses,
 * breaking the whole session rather than this one call.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "ต้องเข้าสู่ระบบก่อนใช้งาน" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SwitchBody;

  if (typeof body.company_id !== "string" || !body.company_id) {
    return NextResponse.json(
      { code: "VALIDATION_FAILED", message: "ไม่ได้ระบุบริษัท" },
      { status: 400 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${USER_SERVICE_URL}${BACKEND_PREFIX}/auth/switch-company`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company_id: body.company_id }),
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { code: "UNKNOWN", message: "ไม่สามารถติดต่อระบบได้" },
      { status: 502 },
    );
  }

  const text = await backendResponse.text();

  if (!backendResponse.ok) {
    return new NextResponse(text || null, {
      status: backendResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const response = new NextResponse(text || null, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  response.cookies.set(COMPANY_COOKIE, body.company_id, {
    ...authCookieOptions(COMPANY_COOKIE_TTL_SECONDS),
  });

  return response;
}

/**
 * Drops a company choice the backend no longer accepts — membership revoked
 * while the session was open. Without this the stale cookie would keep being
 * sent and every page would answer `COMPANY_FORBIDDEN`.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COMPANY_COOKIE);

  return response;
}
