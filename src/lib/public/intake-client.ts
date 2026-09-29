import { messages } from "@/lib/messages";

/**
 * CD-66 — the public pages' way to external-service. Server-side only: the
 * API key (`integration.request.intake`, nothing else) lives in this process's
 * env and never reaches a browser. Not the BFF — the BFF forwards a signed-in
 * person's token; these pages have no person.
 */
const EXTERNAL_SERVICE_URL =
  process.env.EXTERNAL_SERVICE_URL ?? "http://localhost:3003";
const INTAKE_KEY = process.env.CUSTOMER_INTAKE_API_KEY ?? "";

export type IntakeResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

export function intakeConfigured(): boolean {
  return Boolean(INTAKE_KEY);
}

export async function intakeFetch<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<IntakeResult<T>> {
  if (!INTAKE_KEY) {
    return {
      ok: false,
      status: 503,
      code: "NOT_CONFIGURED",
      message: messages.publicForm.notReady,
    };
  }
  try {
    const response = await fetch(
      `${EXTERNAL_SERVICE_URL.replace(/\/$/, "")}/api/v1/request/intake/${path}`,
      {
        method: init.method ?? "GET",
        headers: {
          authorization: `Bearer ${INTAKE_KEY}`,
          "content-type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => null)) as
      (T & { code?: string; message?: string }) | null;
    if (!response.ok) {
      // A 4xx message is written for the person filling the form (a missing
      // contact, a type this form does not take); a 5xx one is for operators
      // and may name configuration — customers get the plain apology.
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "ERROR",
        message:
          response.status < 500 && payload?.message
            ? payload.message
            : messages.publicForm.failed,
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return {
      ok: false,
      status: 503,
      code: "UNAVAILABLE",
      message: messages.publicForm.unreachable,
    };
  }
}
