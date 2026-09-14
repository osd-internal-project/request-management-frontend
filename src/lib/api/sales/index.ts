/**
 * CRM sales API — Lead + โอกาสการขาย (Opportunity). Server-side reads; mutations go
 * through `appApi` from client components, same split as customers.
 */
import { apiGet, type ApiResult } from "../core";
import type {
  LeadDetail,
  LeadStatusSetting,
  OpportunityDetail,
  OpportunityLostReason,
  OpportunityRow,
  LeadRow,
  Paginated,
} from "../types";

export async function getLeads(options?: {
  search?: string;
  status?: string;
  view?: "mine";
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<LeadRow>>> {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.status) params.set("status", options.status);
  if (options?.view) params.set("view", options.view);
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet(`leads?${params.toString()}`);
}

export async function getLead(id: string): Promise<ApiResult<LeadDetail>> {
  return apiGet(`leads/${id}`);
}

/**
 * สถานะที่หน้า Lead ใช้วาด pipeline และตัวกรอง — เฉพาะที่เปิดใช้งาน เรียงตาม
 * ลำดับที่ผู้ดูแลตั้งไว้ ("ตั้งค่า CRM → สถานะ Lead").
 */
export async function getLeadStatuses(): Promise<
  ApiResult<LeadStatusSetting[]>
> {
  return apiGet(`leads/statuses`);
}

export async function getOpportunities(options?: {
  search?: string;
  stage?: string;
  open?: boolean;
  customer_id?: string;
  view?: "mine";
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<OpportunityRow>>> {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.stage) params.set("stage", options.stage);
  if (options?.open) params.set("open", "true");
  if (options?.customer_id) params.set("customer_id", options.customer_id);
  if (options?.view) params.set("view", options.view);
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet(`opportunities?${params.toString()}`);
}

export async function getOpportunity(id: string): Promise<ApiResult<OpportunityDetail>> {
  return apiGet(`opportunities/${id}`);
}

export async function getLostReasons(): Promise<ApiResult<OpportunityLostReason[]>> {
  return apiGet(`opportunities/lost-reasons`);
}

const salesApi = {
  getLeads,
  getLead,
  getLeadStatuses,
  getOpportunities,
  getOpportunity,
  getLostReasons,
};
export default salesApi;
