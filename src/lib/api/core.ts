import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  backendUrl,
  COMPANY_COOKIE,
  companyHeader,
} from "../backend";

export interface ApiError {
  code: string;
  message: string;
  details?: { field: string; reason: string }[];
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/**
 * Server-side call to the backend with the session's bearer token.
 *
 * The token stays on the server — it lives in an httpOnly cookie the browser
 * cannot read, and pages render with the data rather than fetching it from
 * client JavaScript.
 *
 * Errors are returned rather than thrown so a page can render a message in
 * place instead of collapsing the whole shell into an error boundary.
 */
export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (!token) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "ต้องเข้าสู่ระบบก่อนใช้งาน" },
    };
  }

  try {
    const response = await fetch(`${backendUrl(path)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        // Without this every page reads the primary company no matter what the
        // header switcher shows — the backend takes the company per request.
        ...companyHeader(store.get(COMPANY_COOKIE)?.value),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as ApiError | null;

      return {
        ok: false,
        error: error ?? {
          code: "UNKNOWN",
          message: `เกิดข้อผิดพลาด (${response.status})`,
        },
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "ไม่สามารถติดต่อระบบได้" },
    };
  }
}
