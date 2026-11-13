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

/** ชุดรายการของ product (12 พ.ย. 2569) — one item of a bundle, as the screens read it. */
export interface ProductBundleItem {
  productCode: string;
  /** null = the code is not (or no longer) in the SAP catalog. */
  productName: string | null;
  unit: string | null;
  quantity: number;
  termMonths: number | null;
  /** false = always quoted; true = the salesperson adds it on the Lead. */
  optional: boolean;
  /** true = not multiplied by how many the customer asks for (a one-off fee). */
  fixedQuantity: boolean;
  /** Standard price in effect today (THB); null = none. */
  unitPrice: number | null;
  priceModel: string | null;
}

export interface ProductBundle {
  id: string;
  name: string;
  note: string;
  active: boolean;
  items: ProductBundleItem[];
  /** What to know from the customer before quoting (13 พ.ย. 2569). */
  requirements: ProductBundleRequirement[];
}

export interface ProductBundleRequirement {
  key: string;
  question: string;
  /** words that count as an answer when no AI reads the reply */
  hints: string[];
}

/** The bundle in use for a product name on a Lead — null when none is set up. */
export async function matchProductBundle(
  name: string,
): Promise<ClientResult<{ bundle: ProductBundle | null }>> {
  return appApi(`pricing/product-bundles/match?name=${encodeURIComponent(name)}`);
}

/** The bundles a salesperson can pick for a Lead — active ones, by name. */
export async function getProductBundleOptions(): Promise<
  ClientResult<{ names: string[] }>
> {
  return appApi("pricing/product-bundles/options");
}

export interface MarkupOptions {
  groups: { code: string; name: string }[];
  segments: { id: string; label: string }[];
}

export function getMarkupOptions(): Promise<ClientResult<MarkupOptions>> {
  return appApi("pricing/markup-rules/options");
}

/** CD-203 — what a discount does to the margin, for the price approval. */
export type WorkTypeKey = WorkType | "none";

export interface DiscountFigures {
  gross: string;
  discount: string;
  discountPct: string | null;
  net: string;
  /** Absent for a viewer who may not see cost. */
  cost?: string;
  marginBeforePct?: string | null;
  marginPct?: string | null;
}

export interface DiscountGroup extends DiscountFigures {
  workType: WorkTypeKey;
  minMarginPct: number;
  below?: boolean;
  maxDiscountPct?: number;
}

export interface DiscountLine {
  lineNo: number;
  description: string;
  workType: WorkTypeKey;
  gross: string;
  discountPct: number;
  net: string;
  cost?: string;
}

export interface QuotationApprovalImpact {
  requestId: string;
  quotation: {
    id: string;
    quotationNo: string;
    version: number;
    status: string;
    title: string;
    partyName: string;
    currency: string;
  };
  costVisible: boolean;
  canChoose: boolean;
  companyMinMarginPct: number;
  minMarginByWorkType: Partial<Record<WorkType, number>>;
  totals: DiscountFigures;
  groups: DiscountGroup[];
  lines: DiscountLine[];
  suggestion: {
    caps: Partial<Record<WorkTypeKey, number>>;
    totals: DiscountFigures;
    groups: DiscountGroup[];
  } | null;
}

export async function chooseDiscount(
  requestId: string,
  caps: Partial<Record<WorkTypeKey, number>>,
  note?: string,
): Promise<ClientResult<QuotationApprovalImpact>> {
  return appApi(`quotation-approvals/${requestId}/choose`, {
    method: "POST",
    body: JSON.stringify({ caps, note }),
  });
}

/** CD-205 — one entry of the pricing exception register. */
export interface PricingException {
  id: string;
  kind: "margin_below" | "price_override" | "discount_option";
  requestId: string;
  requestNo: string | null;
  quotationId: string;
  quotationNo: string;
  version: number;
  opportunityId: string;
  customerId: string | null;
  partyName: string;
  currency: string;
  netTotal: string;
  workType: string | null;
  /** Absent for a viewer who may not see cost. */
  marginPct?: string | null;
  minMarginPct: string | null;
  productCode: string | null;
  description: string | null;
  systemPrice: string | null;
  unitPrice: string | null;
  caps: Record<string, number> | null;
  reason: string | null;
  requestedByName: string | null;
  decision: string;
  decidedAt: string | null;
  approverNames: string[];
  createdAt: string;
}

export interface PricingExceptionQuery {
  kind?: string;
  customer_id?: string;
  for_opportunity?: string;
  q?: string;
  from?: string;
  to?: string;
}

export async function listPricingExceptions(
  query: PricingExceptionQuery,
): Promise<
  ClientResult<{ customerId: string | null; items: PricingException[] }>
> {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, value]) => Boolean(value)) as [
      string,
      string,
    ][],
  );
  return appApi(`pricing/exceptions?${params.toString()}`);
}

/**
 * CD-206 — a supplier's cost for a product, with its date: read from SAP, or
 * typed in (`manual`) by a company with no ERP connected yet.
 */
export interface VendorCost {
  /** Present on the Pricing list; a `manual` row is edited by it. */
  id?: string;
  productCode: string;
  vendorCode: string;
  vendorName: string | null;
  source: "purchase_order" | "special_price" | "manual";
  /** Absent for a viewer who may not see cost. */
  unitCost?: number;
  currency: string;
  docNo: string | null;
  costDate: string;
  validTo: string | null;
  ageDays: number;
  stale: boolean;
}

export async function lookupVendorCosts(
  codes: string[],
  currency: string,
): Promise<ClientResult<{ maxAgeDays: number; items: VendorCost[] }>> {
  const params = new URLSearchParams({ codes: codes.join(","), currency });
  return appApi(`pricing/vendor-costs/lookup?${params.toString()}`);
}

/** Same words the server stores on the line's cost source. */
export function vendorCostLabel(cost: VendorCost): string {
  if (cost.source === "manual") {
    return `กรอกเอง${cost.docNo ? ` ${cost.docNo}` : ""} · ${cost.vendorName ?? cost.vendorCode}`;
  }
  const doc =
    cost.source === "purchase_order"
      ? `ใบสั่งซื้อ ${cost.docNo ?? ""}`.trim()
      : "ราคาพิเศษผู้ขาย";
  return `SAP: ${doc} · ${cost.vendorName ?? cost.vendorCode}`;
}
