import { messages } from "./messages";

/**
 * NFR-06 — Thai first, structured so another language can be added later.
 *
 * The requirement is explicitly *"ยังไม่ต้องแปล"*: nothing is translated yet,
 * and no i18n library is pulled in for a single locale. What has to exist now
 * is the seam, so adding English is one more object and one entry in the map
 * rather than a rewrite of 31 call sites.
 *
 * `Messages` is derived from the Thai object, so a second locale that misses a
 * key — or drifts on the arguments of a function-valued one like
 * `roleAdmin.holdersTitle` — fails to compile instead of rendering
 * `undefined` in front of a user.
 */
export type Messages = typeof messages;

export const LOCALES = ["th"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";

const CATALOG: Record<Locale, Messages> = {
  th: messages,
};

/**
 * Copy for a locale, falling back to Thai.
 *
 * The fallback is deliberate rather than an error: a missing locale should
 * show the app in Thai, never an error page — an unrecognised `Accept-Language`
 * or a stale cookie is not a failure the user can act on.
 */
export function getMessages(locale?: string): Messages {
  return CATALOG[(locale ?? "") as Locale] ?? CATALOG[DEFAULT_LOCALE];
}

export function isLocale(value: string | undefined): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}
