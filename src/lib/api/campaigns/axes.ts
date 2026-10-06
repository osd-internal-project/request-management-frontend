/**
 * CD-268 — the sales axes a campaign can feed. Kept apart from `index.ts`,
 * which reads the session on the server: client components import this.
 */
export const SALES_AXES = [
  "getter",
  "government",
  "partner",
  "keeper",
] as const;
export type SalesAxis = (typeof SALES_AXES)[number];
