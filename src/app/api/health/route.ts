import { NextResponse } from "next/server";

/**
 * Liveness probe for the `rm-fe` container.
 *
 * Its HEALTHCHECK greps this body for `"status":"ok"`, so the shape is a
 * contract with the compose file, not a detail — changing it marks the
 * container unhealthy with nothing in the log to say why.
 *
 * Deliberately reports only that this Next.js server is serving. The backend
 * has its own probe on `rm-core`, and folding that in here would take the
 * frontend down for a database fault it can do nothing about.
 *
 * Route Handlers are uncached by default in this version, so no segment config
 * is needed to keep the answer live.
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
