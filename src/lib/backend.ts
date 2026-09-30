/**
 * Base URL of the backend user-service (NestJS + Keycloak).
 * Server-side only — never exposed to the browser.
 */
export const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL ?? "http://localhost:3001";

/** Base URL of core-service — request, approval, SLA, notification. */
export const CORE_SERVICE_URL =
  process.env.CORE_SERVICE_URL ?? "http://localhost:3002";

/** Base URL of run-number-service — the document-number format screen. */
export const RUN_NUMBER_SERVICE_URL =
  process.env.RUN_NUMBER_SERVICE_URL ?? "http://localhost:3004";

/**
 * The backend's own prefix, from §11.1: `Base URL: /api/v1`.
 *
 * Kept in one constant because it appears on every outbound call — the BFF
 * proxies, `apiGet`, the session lookup and each auth route. Scattering the
 * literal is how half of them get left behind on the next version bump.
 *
 * This is **not** the prefix of the Next routes under `src/app/api/…`; those
 * are this app's own namespace and stay at `/api`.
 */
export const BACKEND_PREFIX = "/api/v1";

/** The full backend URL for a path, e.g. `/requests` → `…/api/v1/requests`. */
export function backendUrl(path: string): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;

  return `${serviceUrlFor(normalised)}${BACKEND_PREFIX}${normalised}`;
}

/**
 * Path prefixes core-service owns. Everything else is user-service.
 *
 * The split is by domain, not by URL shape, which is why
 * `/admin/approval-matrix` sits here while the other `/admin/*` paths do not:
 * the authority matrix belongs to the Approval Engine (D-31), even though it
 * is administered from an admin screen.
 *
 * **A path missing from this list fails silently**, as a 404 from the wrong
 * service — the request is well formed and the endpoint exists, just not
 * there. `/admin/holiday-calendars` was missing for exactly that reason: the
 * working-hours screen was added and `/admin/sla` looked like it covered the
 * whole SLA surface. `yarn spec:check` now compares this list against the
 * routes both services declare, so the next omission is reported rather than
 * met on screen.
 *
 * Written out per route rather than shortened to `/admin/sla`: a prefix that
 * happens to match two paths is a prefix that will match a third by accident.
 *
 * Only these two services are reachable from here. external-service is a
 * separate deployable that outside systems call directly with an `rfk_` key,
 * never through this BFF — its `/request`, `/crm`, `/approval` and `/mcp`
 * prefixes do not belong in this list.
 */
export const CORE_SERVICE_PREFIXES = [
  "/approvals",
  "/bi",
  "/customers",
  "/contracts",
  "/contract-obligations",
  "/contract-templates",
  "/contract-drafts",
  "/contract-reviews",
  "/contract-review-comments",
  "/contract-requests",
  "/esign",
  "/leads",
  "/opportunities",
  "/quotations",
  "/sale-orders",
  "/handovers",
  "/presales",
  "/sales-targets",
  "/campaigns",
  "/target-accounts",
  "/keeper",
  "/products",
  "/notifications",
  "/requests",
  "/request-types",
  "/reports",
  "/admin/api-keys",
  "/admin/erp-sync",
  "/admin/approval-matrix",
  "/admin/bi",
  "/admin/crm",
  "/admin/request-types",
  "/admin/intake-channels",
  "/admin/sla-configs",
  "/admin/holiday-calendars",
  "/admin/notification-templates",
  "/admin/notification-rules",
];

/**
 * Path prefixes run-number-service owns — checked before the core list.
 * `internal/run-numbers` is service-to-service and never reaches this BFF.
 */
export const RUN_NUMBER_SERVICE_PREFIXES = ["/admin/run-numbers"];

/** Which backend serves this path. One place to look when a route 404s. */
export function serviceUrlFor(path: string): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;

  if (
    RUN_NUMBER_SERVICE_PREFIXES.some((prefix) => normalised.startsWith(prefix))
  ) {
    return RUN_NUMBER_SERVICE_URL;
  }

  return CORE_SERVICE_PREFIXES.some((prefix) => normalised.startsWith(prefix))
    ? CORE_SERVICE_URL
    : USER_SERVICE_URL;
}

export const AUTH_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/**
 * The company the user is currently working in (AUTH-05, D-11).
 *
 * Held in a cookie rather than in component state because the backend resolves
 * the active company from the `X-Company-Id` header of *each* request — a
 * choice kept only in memory would be lost on the next navigation, and every
 * page would silently fall back to the primary company.
 *
 * httpOnly like the auth cookies: nothing in the browser needs to read it, and
 * the value only ever travels back out through the BFF.
 */
export const COMPANY_COOKIE = "active_company";

/** The §11.1 header naming the company a request works in. */
export const COMPANY_HEADER = "X-Company-Id";

/**
 * The company header for a request, or nothing when no company is selected.
 *
 * Omitting the header is a valid state, not a failure: the backend reads it as
 * "use my primary company", which is exactly right before the first switch.
 */
export function companyHeader(
  companyId: string | undefined,
): Record<string, string> {
  return companyId ? { [COMPANY_HEADER]: companyId } : {};
}

/**
 * PKCE leg-1 state, held between the redirect to Keycloak and the callback.
 *
 * Both are httpOnly so page scripts cannot read them: the verifier is what
 * proves the callback belongs to the browser that started the login, and the
 * state is the CSRF check. They are cleared as soon as the callback runs.
 */
export const PKCE_VERIFIER_COOKIE = "pkce_verifier";
export const PKCE_STATE_COOKIE = "pkce_state";

/** How long a login may sit half-finished before the verifier expires. */
export const PKCE_TTL_SECONDS = 600;

/**
 * AUTH-02 idle timeout — how long a session survives without activity.
 *
 * This is the `maxAge` of both auth cookies, rewritten on every successful
 * refresh, so it slides forward while the user is working. That is what makes
 * it a real timeout rather than a courtesy: fifteen minutes with no refresh and
 * the browser drops the cookies itself, whether or not our JavaScript ran.
 */
export const SESSION_IDLE_TIMEOUT_SECONDS = Number(
  process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? 15 * 60,
);

/** How often `SessionKeeper` renews the tokens while the user is active. */
export const SESSION_REFRESH_INTERVAL_SECONDS = Number(
  process.env.SESSION_REFRESH_INTERVAL_SECONDS ?? 5 * 60,
);

export const isProduction = process.env.NODE_ENV === "production";

/**
 * The cookie options every auth cookie shares.
 *
 * `secure` is passed in rather than read from `NODE_ENV`, which a standalone
 * build always reports as `production` however it is served. Pass
 * `isSecureOrigin(request)` from `@/lib/app-origin` — see the note there for
 * what a wrongly-set flag does to the login loop.
 */
export function authCookieOptions(maxAge: number, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  };
}
