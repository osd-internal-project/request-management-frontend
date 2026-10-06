import { messages } from "@/lib/messages";

const m = messages.service.assets.portal.public;
export const API = "/api/public/portal";

/** CD-249 — the portal's calls, through the rate-limited public proxy. */
export async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<
  { ok: true; data: T } | { ok: false; status: number; message: string }
> {
  const response = await fetch(`${API}/${path}`, {
    ...init,
    headers: { "content-type": "application/json" },
  }).catch(() => null);
  if (!response) return { ok: false, status: 503, message: m.unavailable };
  const body = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };
  return response.ok
    ? { ok: true, data: body }
    : {
        ok: false,
        status: response.status,
        message: body.message ?? m.unavailable,
      };
}
