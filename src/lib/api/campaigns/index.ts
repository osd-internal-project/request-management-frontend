/**
 * CD-71 แคมเปญ
 *
 * Service: core-service — `/campaigns`
 */
import { apiGet, type ApiResult } from "../core";
import type { SalesAxis } from "./axes";

export interface CampaignRow {
  id: string;
  code: string;
  name: string;
  channel: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  note: string | null;
  active: boolean;
  /** CD-268 — getter | government | partner | keeper. */
  sales_axis: SalesAxis | null;
  receiving_org_unit: { id: string; name: string } | null;
  /** งบมาจากบรรทัดงบรายช่องทาง — แก้งบรวมในฟอร์มไม่ได้. */
  has_budget_lines: boolean;
  spent: number;
  over_budget: boolean;
  targets: { leads: number | null; deals: number | null; sales: number | null };
  /** สัดส่วนที่ถึงเป้า (1 = ถึง) — null เมื่อไม่ตั้งเป้า. */
  progress: {
    leads: number | null;
    deals: number | null;
    sales: number | null;
  };
  /** ผู้ดูแลแคมเปญเห็นทั้งบริษัท คนอื่นนับเฉพาะ Lead ที่มองเห็น. */
  stats: {
    leads: number;
    converted: number;
    won: number;
    sales_amount: number;
    cost_per_lead: number | null;
    sales_per_budget: number | null;
  };
}

export { SALES_AXES, type SalesAxis } from "./axes";

/** CD-268 — `GET /macom/campaigns/:id/plan`. */
export interface CampaignPlan {
  campaign: { id: string; code: string; name: string; active: boolean };
  planned_total: number | null;
  spent_total: number;
  remaining: number | null;
  over_budget: boolean;
  unassigned_spent: number;
  lines: {
    id: string;
    channel: string;
    planned: number;
    note: string | null;
    spent: number;
    over_budget: boolean;
  }[];
  spends: {
    id: string;
    spent_on: string;
    amount: number;
    budget_line: { id: string; channel: string } | null;
    vendor: string | null;
    note: string | null;
    receipt_name: string | null;
    created_by: string | null;
    created_at: string;
    voided: boolean;
    void_reason: string | null;
    voided_by: string | null;
  }[];
}

export function getCampaigns(options?: {
  active?: boolean;
}): Promise<ApiResult<CampaignRow[]>> {
  return apiGet<CampaignRow[]>(
    `/campaigns${options?.active ? "?active=true" : ""}`,
  );
}
