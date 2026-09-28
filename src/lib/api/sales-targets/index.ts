/**
 * CD-82 เป้าและพยากรณ์
 *
 * Service: core-service — `/sales-targets`
 */
import { apiGet, type ApiResult } from "../core";

export type SalesTargetScope = "user" | "org_unit";

export interface SalesTargetRow {
  id: string;
  scope: SalesTargetScope;
  subject_id: string;
  subject_name: string;
  period: string;
  amount: number;
  /** ยอดขายจริง (ใบสั่งขายที่ไม่ยกเลิก). */
  actual: number;
  /** ยอดจริง + pipeline ถ่วงที่คาดว่าจะปิดในเดือน; เดือนที่จบแล้ว = ยอดจริง. */
  forecast: number;
  attainment_pct: number | null;
  forecast_pct: number | null;
  pending: {
    revision_id: string;
    new_amount: number;
    approval_request_id: string | null;
  } | null;
}

export interface SalesTargetList {
  period: string;
  started: boolean;
  closed: boolean;
  can_manage: boolean;
  adjustment_configured: boolean;
  targets: SalesTargetRow[];
}

export interface SalesTargetRevision {
  id: string;
  previous_amount: number | null;
  new_amount: number;
  reason: string | null;
  status: "applied" | "pending_approval" | "rejected" | "cancelled";
  approval_request_id: string | null;
  decided_at: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface SetSalesTargetResult {
  target_id: string;
  applied: boolean;
  approval_request_id: string | null;
}

export function getSalesTargets(
  period?: string,
): Promise<ApiResult<SalesTargetList>> {
  return apiGet<SalesTargetList>(
    `/sales-targets${period ? `?period=${encodeURIComponent(period)}` : ""}`,
  );
}
