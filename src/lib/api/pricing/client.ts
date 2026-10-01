/**
 * CD-194 ราคามาตรฐาน — client-side calls and the types both halves share.
 * Client components import from here only: `./index` reads cookies on the
 * server (`next/headers`).
 */
import { appApi, type ClientResult } from "../client";

export type PriceStatus = "current" | "future" | "expired";
/** CD-196 — ต่อหน่วย / เหมา / ต่อเดือน. */
export type PriceModel = "unit" | "lump_sum" | "monthly";
export const PRICE_MODELS: PriceModel[] = ["unit", "lump_sum", "monthly"];
/** CD-197 — who a price is for. */
export type PriceScope = "standard" | "segment" | "customer" | "opportunity";
export const SPECIAL_SCOPES: Exclude<PriceScope, "standard">[] = [
  "customer",
  "segment",
  "opportunity",
];

export interface ProductPriceRow {
  id: string;
  productCode: string;
  productName: string | null;
  priceModel: PriceModel;
  /** CD-197 */
  scope: PriceScope;
  target: { id: string; label: string } | null;
  currency: string;
  unitPrice: number;
  /** YYYY-MM-DD */
  validFrom: string;
  /** YYYY-MM-DD, null = no end. */
  validTo: string | null;
  note: string;
  status: PriceStatus;
  updatedAt: string;
}

export interface PriceLookup {
  price_id: string;
  price_model: PriceModel;
  /** CD-197 — where the price came from. */
  scope: PriceScope;
  unit_price: number;
  currency: string;
  valid_from: string;
  valid_to: string | null;
}

/** The price in effect today for each code — codes without one are absent. */
export function lookupPrices(
  codes: string[],
  currency: string,
  /** CD-197 — the quotation's deal: brings in its special prices. */
  opportunityId?: string,
): Promise<ClientResult<Record<string, PriceLookup>>> {
  const deal = opportunityId
    ? `&opportunity_id=${encodeURIComponent(opportunityId)}`
    : "";
  return appApi(
    `pricing/prices/lookup?codes=${encodeURIComponent(codes.join(","))}&currency=${encodeURIComponent(currency)}${deal}`,
  );
}

/** CD-197 — options for the special-price target picker. */
export function searchPriceTargets(
  kind: Exclude<PriceScope, "standard">,
  q: string,
): Promise<ClientResult<{ id: string; label: string }[]>> {
  return appApi(
    `pricing/prices/targets?kind=${kind}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  );
}

/** CD-195 — one saved state of a price. */
export interface PriceVersion {
  versionNo: number;
  action: "created" | "updated" | "ended" | "revised" | "removed";
  unitPrice: number;
  priceModel: PriceModel;
  currency: string;
  validFrom: string;
  validTo: string | null;
  note: string;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export function getPriceVersions(
  id: string,
): Promise<ClientResult<PriceVersion[]>> {
  return appApi(`pricing/prices/${id}/versions`);
}

/** CD-200 — the markup that applies to each line of a deal, or null. */
export function suggestMarkup(
  lines: { product_code?: string; work_type?: string }[],
  opportunityId?: string,
): Promise<ClientResult<({ rule_id: string; markup_pct: number } | null)[]>> {
  return appApi("pricing/markup-rules/suggest", {
    method: "POST",
    body: JSON.stringify({ lines, opportunity_id: opportunityId }),
  });
}

export type WorkType = "equipment" | "material" | "software" | "service";
export const WORK_TYPES: WorkType[] = [
  "equipment",
  "material",
  "software",
  "service",
];

/** CD-200 — a markup rule as the list shows it. */
export interface MarkupRule {
  id: string;
  priority: number;
  workType: WorkType | null;
  productGroupCode: string | null;
  productGroupName: string | null;
  segmentValueId: string | null;
  segmentLabel: string | null;
  markupPct: number;
  note: string;
  active: boolean;
}

export interface MarkupOptions {
  groups: { code: string; name: string }[];
  segments: { id: string; label: string }[];
}

export function getMarkupOptions(): Promise<ClientResult<MarkupOptions>> {
  return appApi("pricing/markup-rules/options");
}
