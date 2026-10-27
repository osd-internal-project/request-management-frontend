import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  backendUrl,
  COMPANY_COOKIE,
  companyHeader,
} from "@/lib/backend";

/**
 * SSE pipe for `/agent-records/stream` — beside the catch-all proxy because a
 * stream needs two things that one does not do: the browser's abort travels to
 * the backend (`request.signal`), so a closed tab stops core-service's polling at
 * once instead of after 15 minutes, and the response is marked unbuffered.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "ต้องเข้าสู่ระบบก่อนใช้งาน" },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${backendUrl("/agent-records/stream")}${request.nextUrl.search}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
          ...companyHeader(request.cookies.get(COMPANY_COOKIE)?.value),
        },
        signal: request.signal,
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { code: "UNKNOWN", message: "ไม่สามารถติดต่อระบบได้" },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || null, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
