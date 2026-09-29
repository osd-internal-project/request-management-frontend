/**
 * CD-66 — a small in-memory limiter for the public form: `limit` submissions
 * per `windowMs` per client address, per process. Enough to stop a script
 * hammering one instance; behind several instances each keeps its own count
 * (docs/customer-intake.md). No external store on purpose — the form must not
 * depend on one more service being up.
 */
const hits = new Map<string, number[]>();

export function allow(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // keep the map from growing without bound
  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (!times.some((at) => now - at < windowMs)) hits.delete(k);
    }
  }
  return true;
}

/** The caller's address as the proxy in front reports it. */
export function clientAddress(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
