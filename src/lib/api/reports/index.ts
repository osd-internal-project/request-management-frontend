/**
 * Reports API
 *
 * Services: core-service
 */
import { apiGet, type ApiResult } from "../core";

/** One row of REQ-09 — a step position within a request type. */
export interface BottleneckRow {
  type_code: string;
  step_no: number;
  approver_role: string;
  approver_user_id: string | null;
  decided_count: number;
  pending_count: number;
  mean_hours: number | null;
  max_hours: number | null;
}

export function getBottleneck(options?: {
  type_code?: string;
  from?: string;
  to?: string;
}): Promise<ApiResult<BottleneckRow[]>> {
  const params = new URLSearchParams();
  if (options?.type_code) params.set("type_code", options.type_code);
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);

  const query = params.toString();
  return apiGet<BottleneckRow[]>(
    `/reports/request-bottleneck${query ? `?${query}` : ""}`,
  );
}

/** CD-83 — ตัวเลขชุดเดียวกันใช้ทั้งยอดรวมและรายบุคคล. */
export interface SalesFigures {
  sales_amount: number;
  sale_order_count: number;
  won_count: number;
  won_amount: number;
  lost_count: number;
  lost_amount: number;
  /** 0–100; null = ยังไม่มีดีลปิดในช่วง (ไม่ใช่ 0%). */
  win_rate: number | null;
  /** ค้างใน pipeline ตอนนี้ — ไม่ขึ้นกับช่วงที่เลือก. */
  open_count: number;
  open_amount: number;
}

export interface SalesReport {
  period: { from: string; to: string };
  totals: SalesFigures;
  lost_reasons: {
    code: string | null;
    name: string;
    count: number;
    amount: number;
  }[];
  by_owner: (SalesFigures & { owner_user_id: string; owner_name: string })[];
}

/** CD-83 รายงานยอดขาย — `from`/`to` เป็นวันที่ `YYYY-MM-DD` ตามเวลาไทย นับรวมทั้งสองปลาย. */
export function getSalesReport(options?: {
  from?: string;
  to?: string;
}): Promise<ApiResult<SalesReport>> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);

  const query = params.toString();
  return apiGet<SalesReport>(
    `/opportunities/report${query ? `?${query}` : ""}`,
  );
}
