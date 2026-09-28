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

/** CD-73 — `view`: `team` = ทุกอย่างที่เห็นได้, `mine` = ที่ตัวเองเป็นเจ้าของ. */
export interface CrmDashboard {
  view: "mine" | "team";
  /** ต้นเดือนนี้ตามเวลาไทย — ฐานของตัวเลข "เดือนนี้". */
  month_from: string;
  /** null = ไม่มีสิทธิ์ดูทะเบียนลูกค้า (ไม่ใช่ 0 ราย). */
  customers: { active: number; new_this_month: number } | null;
  leads: {
    open: number;
    new_this_month: number;
    by_status: { code: string; name: string; color: string; count: number }[];
  };
  opportunities: {
    open_count: number;
    open_amount: number;
    weighted_amount: number;
    stale_count: number;
    won_this_month: { count: number; amount: number };
    by_stage: {
      stage: string;
      count: number;
      amount: number;
      weighted_amount: number;
    }[];
  };
  activities: {
    overdue: number;
    due_soon: number;
    completed_this_month: number;
  };
}

export function getCrmDashboard(options?: {
  view?: string;
}): Promise<ApiResult<CrmDashboard>> {
  const view = options?.view === "mine" ? "?view=mine" : "";
  return apiGet<CrmDashboard>(`/opportunities/dashboard${view}`);
}
