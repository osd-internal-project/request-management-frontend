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

export interface ProductPriceRow {
  id: string;
  productCode: string;
  productName: string | null;
  priceModel: PriceModel;
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
  unit_price: number;
  currency: string;
  valid_from: string;
  valid_to: string | null;
}

/** The price in effect today for each code — codes without one are absent. */
export function lookupPrices(
  codes: string[],
  currency: string,
): Promise<ClientResult<Record<string, PriceLookup>>> {
  return appApi(
    `pricing/prices/lookup?codes=${encodeURIComponent(codes.join(","))}&currency=${encodeURIComponent(currency)}`,
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
