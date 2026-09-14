/**
 * The status box of `งานค้างของฉัน` (§16 หน้าที่ 2).
 *
 * The screen is called *งานค้าง*, so it opens on work that is still somebody's
 * to finish and leaves out `closed` / `cancelled` / `rejected`. That default is
 * a **value in the status box**, not a hidden rule: `OPEN_FILTER` is what the
 * box shows as selected, and `ALL_FILTER` is one click away.
 *
 * Saying it on screen is the whole design. A tab that quietly filtered by
 * status was the defect of 4 ก.ย. 2569 — a receiver whose tickets had all been
 * closed read `รับเรื่อง · 0` as data loss, with nothing to say a filter was in
 * play. The rule there was invisible; this one names itself and can be cleared.
 *
 * Kept in a plain module rather than beside the component: the component is
 * `"use client"`, and a value exported from a client module and imported by a
 * server component arrives as a client *reference* rather than the string
 * itself. Only the component crossing that boundary is a real export.
 */

/** Still somebody's to finish — the server's `open=true`. */
export const OPEN_FILTER = "open";

/** Every status, including the three that mean the request is over. */
export const ALL_FILTER = "all";

/**
 * How the status box's value reaches `GET /requests`.
 *
 * `OPEN_FILTER` and `ALL_FILTER` are this screen's vocabulary, not the API's —
 * translated here so the request only ever carries a real status or the
 * `open` flag, and the eleven status values keep meaning exactly one status.
 */
export function statusFilterArgs(value: string | undefined): {
  status?: string;
  open?: boolean;
} {
  const chosen = value ?? OPEN_FILTER;

  if (chosen === ALL_FILTER) return {};
  if (chosen === OPEN_FILTER) return { open: true };

  return { status: chosen };
}
