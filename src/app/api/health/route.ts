import { NextResponse } from "next/server";

/**
 * Health endpoint for the labs compose healthcheck.
 *
 * It answers for this process only: it deliberately does not call user-service
 * or core-service. A backend outage must not make Docker restart a frontend
 * that is serving fine — the pages that need those services report their own
 * failures.
 *
 * It exists because every other route either redirects to login or renders a
 * page, and a healthcheck that follows a redirect proves nothing.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
