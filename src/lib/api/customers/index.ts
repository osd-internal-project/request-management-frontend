/**
 * Customers API — CRM ระยะ 1 (CM-xx)
 *
 * Database: customers + children
 * Services: core-service
 *
 * Server-side reads only. Mutations go through `appApi` from client
 * components (`@/lib/api/client`), because they carry user input and need the
 * error envelope rendered in place.
 */

import { apiGet, type ApiResult } from "../core";
import type {
  ContactConsentStatus,
  CustomerDetail,
  CustomerFieldChange,
  CustomerRow,
  CustomerSummary,
  CustomerTimelineEvent,
  Paginated,
  SegmentDimension,
  SegmentOption,
} from "../types";

/** `GET /customers` — scope decided at the backend (SCOPE-02). */
export async function getCustomers(options?: {
  search?: string;
  status?: string;
  segment_value_id?: string;
  view?: "mine";
  page?: number;
  page_size?: number;
}): Promise<ApiResult<Paginated<CustomerRow>>> {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.status) params.set("status", options.status);
  if (options?.segment_value_id) {
    params.set("segment_value_id", options.segment_value_id);
  }
  if (options?.view) params.set("view", options.view);
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  return apiGet<Paginated<CustomerRow>>(`/customers?${params.toString()}`);
}

export async function getCustomer(
  id: string,
): Promise<ApiResult<CustomerDetail>> {
  return apiGet<CustomerDetail>(`/customers/${id}`);
}

/** CM-01 — the ประวัติการแก้ไข tab. */
export async function getCustomerHistory(
  id: string,
): Promise<ApiResult<CustomerFieldChange[]>> {
  return apiGet<CustomerFieldChange[]>(`/customers/${id}/history`);
}

/** C360-03 — already filtered to what this viewer may see. */
export async function getCustomerTimeline(
  id: string,
): Promise<ApiResult<CustomerTimelineEvent[]>> {
  return apiGet<CustomerTimelineEvent[]>(`/customers/${id}/timeline`);
}

/** CM-05 — consent badge อ่านสดจากระบบ PDPA กลาง. */
export async function getContactConsents(
  id: string,
): Promise<ApiResult<ContactConsentStatus[]>> {
  return apiGet(`customers/${id}/contacts/consents`);
}

/** C360-01 — ตัวเลขการ์ดหน้า 360° นับผ่าน filter เดียวกับแท็บ. */
export async function getCustomerSummary(
  id: string,
): Promise<ApiResult<CustomerSummary>> {
  return apiGet(`customers/${id}/summary`);
}

/**
 * CM-07 — active values with their dimensions, for the form's pickers and the
 * register's filter. `crm.customer.read` suffices; the admin surface (which
 * also shows inactive rows and edits them) is a different endpoint behind
 * `admin.crm.manage`.
 */
export async function getSegmentOptions(): Promise<
  ApiResult<SegmentOption[]>
> {
  return apiGet<SegmentOption[]>(`/customers/segment-options`);
}

/** CM-04 ชุดงาน B — ตาราง product ที่ต้อง KYC (admin, รวม inactive). */
export async function getKycProducts(): Promise<
  ApiResult<import("@/lib/api/types").KycProductRule[]>
> {
  return apiGet(`/admin/crm/kyc-products`);
}

/** The admin screen's read — dimensions with every value, inactive included. */
export async function getSegmentDimensions(): Promise<
  ApiResult<SegmentDimension[]>
> {
  return apiGet<SegmentDimension[]>(`/admin/crm/segment-dimensions`);
}

const customersApi = {
  getCustomers,
  getCustomer,
  getCustomerHistory,
  getCustomerTimeline,
  getCustomerSummary,
  getContactConsents,
  getKycProducts,
  getSegmentOptions,
  getSegmentDimensions,
};

export default customersApi;
