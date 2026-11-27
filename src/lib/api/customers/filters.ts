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

/** Columns the register can be ordered by — the backend's whitelist, by name. */
export const CUSTOMER_SORT_FIELDS = [
  "customerCode",
  "nameTh",
  "branchCode",
  "branchName",
  "status",
  "updatedAt",
] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];
export interface CustomerSort {
  field: CustomerSortField;
  descending: boolean;
}

/** `sort=field` ascending, `sort=-field` descending; anything else is no sort. */
export function parseCustomerSort(value?: string): CustomerSort | undefined {
  if (!value) return undefined;
  const descending = value.startsWith("-");
  const field = (descending ? value.slice(1) : value) as CustomerSortField;
  return CUSTOMER_SORT_FIELDS.includes(field)
    ? { field, descending }
    : undefined;
}

export function customerSortParam(sort: CustomerSort): string {
  return `${sort.descending ? "-" : ""}${sort.field}`;
}
