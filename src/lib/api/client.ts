/**
 * Calls the backend from a **client** component, through the BFF proxy.
 *
 * `core.ts` cannot serve this: it reads the session cookie with
 * `next/headers`, which only exists on the server. Client components therefore
 * go through the Next routes under `src/app/api/…`, which attach the bearer
 * token and `X-Company-Id` server-side — the browser never holds a credential.
 *
 * This exists because three components had each grown their own copy of the
 * same fetch wrapper (`org-admin`, `approval-matrix-admin`, `approval-inbox`).
 * Three copies is three places for the error handling to drift.
 */

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/** The BFF namespaces. `admin` is the admin API, `app` everything else. */
type Namespace = "admin" | "app";

async function send<T>(
  namespace: Namespace,
  path: string,
  init?: RequestInit,
): Promise<ClientResult<T>> {
  let response: Response;

  try {
    response = await fetch(`/api/${namespace}/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Offline, DNS, connection reset — the caller still gets a result to
    // render rather than an unhandled rejection.
    return { ok: false, message: "ไม่สามารถติดต่อระบบได้" };
  }

  // 204 carries no body; parsing it would throw.
  if (response.status === 204) return { ok: true, data: undefined as T };

  const body = (await response.json().catch(() => null)) as
    | (T & { message?: string })
    | null;

  return response.ok
    ? { ok: true, data: body as T }
    : { ok: false, message: body?.message ?? `HTTP ${response.status}` };
}

/** `/api/admin/…` — org chart, roles, request types, approval matrix. */
export function adminApi<T>(path: string, init?: RequestInit) {
  return send<T>("admin", path, init);
}

/** `/api/app/…` — requests, approvals, notifications. */
export function appApi<T>(path: string, init?: RequestInit) {
  return send<T>("app", path, init);
}
