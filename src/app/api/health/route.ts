import { NextResponse } from "next/server";

/**
 * Liveness/readiness probe for the Helm deployment.
 *
 * It answers for this process only: it deliberately does not call
 * user-service or core-service. A backend outage must not make Kubernetes
 * restart healthy frontend pods — the pages that need those services report
 * their own failures.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
