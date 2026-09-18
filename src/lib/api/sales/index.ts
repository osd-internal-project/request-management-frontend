/**
 * CRM sales API — Lead + โอกาสการขาย (Opportunity). Server-side reads; mutations go
 * through `appApi` from client components, same split as customers.
 */
import { apiGet, type ApiResult } from "../core";
import type {
  LeadDetail,
  OpportunityActivity,
  OpportunityDetail,
  OpportunityLostReason,
  OpportunityRow,
  LeadRow,
  Paginated,
  QuotationDetail,
  QuotationPrintView,
  QuotationRow,
  QuotationStatus,
  SaleOrderRow,
  SaleOrderStatus,
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

export async function getOpportunities(options?: {
  search?: string;
  stage?: string;
  open?: boolean;
  customer_id?: string;
  view?: "mine";
  /** CD-65 — `overdue` = นัดติดตามเลยกำหนด, `stale` = ถูกแจ้งว่าเงียบ. */
  follow_up?: "overdue" | "stale";
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<OpportunityRow>>> {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.stage) params.set("stage", options.stage);
  if (options?.open) params.set("open", "true");
  if (options?.customer_id) params.set("customer_id", options.customer_id);
  if (options?.view) params.set("view", options.view);
  if (options?.follow_up) params.set("follow_up", options.follow_up);
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet(`opportunities?${params.toString()}`);
}

export async function getOpportunity(id: string): Promise<ApiResult<OpportunityDetail>> {
  return apiGet(`opportunities/${id}`);
}

/** CD-65 กิจกรรมและนัดติดตาม — ใหม่สุดก่อน. */
export async function getOpportunityActivities(
  id: string,
): Promise<ApiResult<OpportunityActivity[]>> {
  return apiGet(`opportunities/${id}/activities`);
}

export async function getLostReasons(): Promise<ApiResult<OpportunityLostReason[]>> {
  return apiGet(`opportunities/lost-reasons`);
}

/** ใบเสนอราคา (CD-76) — ต้นทุน/margin ถูกปกปิดที่ API สำหรับผู้ไม่มีสิทธิ์. */
export async function getQuotations(options?: {
  opportunity_id?: string;
  customer_id?: string;
  status?: QuotationStatus;
  search?: string;
  /** ซ่อนฉบับที่ถูกเวอร์ชันใหม่แทนแล้ว. */
  current?: boolean;
  view?: "mine";
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<QuotationRow>>> {
  const params = new URLSearchParams();
  if (options?.opportunity_id) params.set("opportunity_id", options.opportunity_id);
  if (options?.customer_id) params.set("customer_id", options.customer_id);
  if (options?.status) params.set("status", options.status);
  if (options?.search) params.set("search", options.search);
  if (options?.current) params.set("current", "true");
  if (options?.view) params.set("view", options.view);
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet(`quotations?${params.toString()}`);
}

export async function getQuotation(id: string): Promise<ApiResult<QuotationDetail>> {
  return apiGet(`quotations/${id}`);
}

/** ฉบับส่งลูกค้า — หัวกระดาษ + ผู้ซื้อ + รายการ, ไม่มีต้นทุน/margin. */
export async function getQuotationPrint(
  id: string,
): Promise<ApiResult<QuotationPrintView>> {
  return apiGet(`quotations/${id}/print`);
}

/** ใบสั่งขาย (CD-77 โครงระยะ 1). */
export async function getSaleOrders(options?: {
  opportunity_id?: string;
  customer_id?: string;
  status?: SaleOrderStatus;
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<SaleOrderRow>>> {
  const params = new URLSearchParams();
  if (options?.opportunity_id) params.set("opportunity_id", options.opportunity_id);
  if (options?.customer_id) params.set("customer_id", options.customer_id);
  if (options?.status) params.set("status", options.status);
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet(`sale-orders?${params.toString()}`);
}

const salesApi = {
  getLeads,
  getLead,
  getOpportunities,
  getOpportunity,
  getLostReasons,
  getQuotations,
  getQuotation,
  getSaleOrders,
};
export default salesApi;
