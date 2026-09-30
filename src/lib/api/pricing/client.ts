/**
 * CD-194 ราคามาตรฐาน — client-side calls and the types both halves share.
 * Client components import from here only: `./index` reads cookies on the
 * server (`next/headers`).
 */
import { appApi, type ClientResult } from "../client";

export type PriceStatus = "current" | "future" | "expired";

export interface ProductPriceRow {
  id: string;
  productCode: string;
  productName: string | null;
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
