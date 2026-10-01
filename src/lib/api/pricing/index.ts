/** CD-194 ราคามาตรฐาน — server-side reads; see `./client` for the rest. */
import { apiGet, type ApiResult } from "../core";
import type { PriceStatus, ProductPriceRow } from "./client";

export type { PriceStatus, ProductPriceRow } from "./client";

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
