/**
 * CD-86 Keeper — portfolio of existing customers (core-service,
 * `crm.customer.read`). Account detail and writes go through `appApi` from the
 * customer page's account tab.
 */
import { apiGet, type ApiResult } from "../core";
import type { Portfolio } from "../types";

export function getPortfolio(options?: {
  view?: "mine" | "team";
  tier?: string;
  health?: string;
  search?: string;
}): Promise<ApiResult<Portfolio>> {
  const params = new URLSearchParams();
  if (options?.view) params.set("view", options.view);
  if (options?.tier) params.set("tier", options.tier);
  if (options?.health) params.set("health", options.health);
  if (options?.search) params.set("search", options.search);
  return apiGet(`keeper/portfolio?${params.toString()}`);
}
