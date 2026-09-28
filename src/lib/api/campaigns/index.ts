/**
 * CD-71 แคมเปญ
 *
 * Service: core-service — `/campaigns`
 */
import { apiGet, type ApiResult } from "../core";

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
  /** นับเฉพาะ Lead ที่ผู้ดูมองเห็น. */
  stats: {
    leads: number;
    converted: number;
    won: number;
    sales_amount: number;
    cost_per_lead: number | null;
    sales_per_budget: number | null;
  };
}

export function getCampaigns(options?: {
  active?: boolean;
}): Promise<ApiResult<CampaignRow[]>> {
  return apiGet<CampaignRow[]>(
    `/campaigns${options?.active ? "?active=true" : ""}`,
  );
}
