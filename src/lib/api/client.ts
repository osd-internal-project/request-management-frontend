/**
 * Calls the backend from a **client** component, through the BFF proxy.
 *
 * `core.ts` cannot serve this: it reads the session cookie with
 * `next/headers`, which only exists on the server. Client components therefore
 * go through the Next routes under `src/app/api/…`, which attach the bearer
 * token and `X-Company-Id` server-side — the browser never holds a credential.
 *
 * This exists because three components had each grown their own copy of the
 * same fetch wrapper (`org-admin`, `approval-matrix-admin`, and the approval
 * inbox that has since been folded into the request screen).
 * Three copies is three places for the error handling to drift.
 */

import { messages } from "@/lib/messages";
import { SESSION_EXPIRED_PATH } from "@/lib/routes";

export type ClientResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      /**
       * The `code` from the backend's `{ code, message, details }` envelope.
       *
       * Carried because some failures are not failures to the person looking
       * at the screen: a request type with no approval matrix answers
       * `APV_MATRIX_NOT_FOUND`, and that is configuration ("no approval step"),
       * not an error to apologise for. Branching on the message text instead
       * would break the moment a Thai string is reworded.
       */
      code?: string;
      /**
       * The per-field reasons behind a `VALIDATION_FAILED`. Dropping them left
       * a rejected form showing only "Bad Request Exception", with nothing
       * anywhere saying which field the backend refused.
       */
      details?: { field: string; reason: string }[];
    };

/** The BFF namespaces. `admin` is the admin API, `app` everything else. */
type Namespace = "admin" | "app";

/**
 * The renewal currently in flight, shared by every caller (AUTH-02).
 *
 * A screen that loads five endpoints at once will see five 401s the moment the
 * access token lapses. Letting each spend the refresh token independently is
 * not merely wasteful: against a realm with refresh-token rotation the first
 * call invalidates the token the other four are holding, and a session that
 * would have renewed cleanly is destroyed instead.
 */
let renewal: Promise<boolean> | null = null;

function renewSession(): Promise<boolean> {
  renewal ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      renewal = null;
    });

  return renewal;
}

async function send<T>(
  namespace: Namespace,
  path: string,
  init?: RequestInit,
  isRetry = false,
): Promise<ClientResult<T>> {
  let response: Response;

  try {
    // FormData must set its own multipart boundary, so no JSON header for it.
    const isForm = init?.body instanceof FormData;
    response = await fetch(`/api/${namespace}/${path}`, {
      ...init,
      headers: isForm
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Offline, DNS, connection reset — the caller still gets a result to
    // render rather than an unhandled rejection.
    return { ok: false, code: "NETWORK", message: "ไม่สามารถติดต่อระบบได้" };
  }

  /**
   * The token aged out between page load and this click. Renew once and repeat
   * the call, so the user sees their data instead of a red alert on a screen
   * where nothing is actually wrong.
   *
   * `isRetry` is what bounds this: a request that has already been retried
   * takes the 401 as final, and a session that is genuinely over ends at
   * logout rather than in a loop.
   */
  if (response.status === 401 && !isRetry) {
    if (await renewSession()) return send<T>(namespace, path, init, true);

    window.location.href = SESSION_EXPIRED_PATH;
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: messages.login.errors.session_expired,
    };
  }

  // 204 carries no body; parsing it would throw.
  if (response.status === 204) return { ok: true, data: undefined as T };

  const body = (await response.json().catch(() => null)) as
    | (T & {
        code?: string;
        message?: string;
        details?: { field: string; reason: string }[];
      })
    | null;

  return response.ok
    ? { ok: true, data: body as T }
    : {
        ok: false,
        code: body?.code,
        message: body?.message ?? `HTTP ${response.status}`,
        ...(body?.details?.length ? { details: body.details } : {}),
      };
}

/** `/api/admin/…` — org chart, roles, request types, approval matrix. */
export function adminApi<T>(path: string, init?: RequestInit) {
  return send<T>("admin", path, init);
}

/** `/api/app/…` — requests, approvals, notifications. */
export function appApi<T>(path: string, init?: RequestInit) {
  return send<T>("app", path, init);
}
