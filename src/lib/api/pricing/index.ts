/** CD-194 ราคามาตรฐาน — server-side reads; see `./client` for the rest. */
import { apiGet, type ApiResult } from "../core";
import type {
  MarkupRule,
  PriceStatus,
  ProductBundle,
  ProductPriceRow,
  QuotationApprovalImpact,
} from "./client";

export type { MarkupRule, PriceStatus, ProductPriceRow } from "./client";

export async function getPrices(query: {
  q?: string;
  status?: PriceStatus;
  /** CD-197 */
  scope?: "standard" | "special";
}): Promise<ApiResult<ProductPriceRow[]>> {
  const params = new URLSearchParams();
  if (query.scope === "special") params.set("scope", "special");
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return apiGet(qs ? `pricing/prices?${qs}` : "pricing/prices");
}

/** CD-200 — markup rules in priority order. */
export async function getMarkupRules(): Promise<ApiResult<MarkupRule[]>> {
  return apiGet("pricing/markup-rules");
}

/** ชุดรายการของ product — every bundle of the company, items priced. */
export async function getProductBundles(): Promise<ApiResult<ProductBundle[]>> {
  return apiGet("pricing/product-bundles");
}

/** CD-203 — the discount's effect on the quotation a price request approves. */
export async function getQuotationApproval(
  requestId: string,
): Promise<ApiResult<QuotationApprovalImpact>> {
  return apiGet(`quotation-approvals/${requestId}`);
}
