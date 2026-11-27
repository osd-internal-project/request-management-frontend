/**
 * Shared by the server-side reader and the client-side filter panel — kept out
 * of `index.ts`, which reads cookies and cannot be imported by a client component.
 */

/** ค้นหาเพิ่มเติม — the list's per-field filters; URL and API share the names. */
export const CUSTOMER_FIELD_FILTERS = [
  "customer_code",
  "name",
  "branch_code",
  "branch_name",
  "tax_id",
  "external_code",
  "head_office_id",
] as const;
export type CustomerFieldFilter = (typeof CUSTOMER_FIELD_FILTERS)[number];
