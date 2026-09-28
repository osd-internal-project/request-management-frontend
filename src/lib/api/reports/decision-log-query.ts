/**
 * APV-06 (CD-45) — the decision log's filters as a query string.
 *
 * Its own module because the client table builds the CSV link with it, and
 * `./index.ts` pulls in `../core`, which reads `next/headers` and so cannot
 * be bundled for the browser.
 */
export interface DecisionLogFilters {
  from?: string;
  to?: string;
  basis?: string;
  page?: string;
}

export function decisionLogQuery(filters: DecisionLogFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.basis) params.set("basis", filters.basis);
  return params.toString();
}
