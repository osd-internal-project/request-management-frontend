/**
 * คิวส่ง SAP — `admin.integration.manage` (CM-06 / CD-88, 24 ก.ย. 2569)
 *
 * Database: integration_sync_jobs (+ customers, sale_orders สำหรับชื่อที่คนอ่าน)
 * Services: core-service — `/admin/erp-sync/*`
 *
 * ผ่าน BFF (`adminApi`) เพราะทุกตัวยิงจากการคลิกบนหน้าจอผู้ดูแล
 */

import { adminApi, type ClientResult } from "../client";

export type ErpJobFilter = "failed" | "pending" | "all";

export interface ErpJobRow {
  id: string;
  /** customer_upsert | receivables_refresh | sale_order_create | sale_order_cancel */
  kind: string;
  /** `succeeded` มาจากคำตอบของ `retryErpJob` เท่านั้น — รายการมีแต่งานที่ค้าง. */
  status: "pending" | "failed" | "succeeded";
  attempts: number;
  /** ข้อผิดพลาดล่าสุดตามที่ SAP ตอบ. */
  lastError: string | null;
  /** รอบถัดไปที่ระบบจะลองเอง (งานที่ยัง pending). */
  runAfter: string;
  createdAt: string;
  updatedAt: string;
  resource: {
    type:
      | "customer"
      | "sale_order"
      | "service_billing"
      | "service_material"
      | "installment_invoice";
    id: string;
    code: string;
    name: string;
  };
}

export interface ErpJobList {
  summary: { failed: number; pending: number };
  items: ErpJobRow[];
}

export async function listErpJobs(
  status: ErpJobFilter = "failed",
): Promise<ClientResult<ErpJobList>> {
  return adminApi<ErpJobList>(`erp-sync/jobs?status=${status}`);
}

/**
 * เริ่มนับรอบใหม่และส่งทันที — backend รอผลไม่เกิน ~5 วินาทีแล้วตอบสถานะจริง:
 * succeeded = ถึง SAP แล้ว, มี lastError ใหม่ = ยังไม่ผ่าน, pending = ยังส่งอยู่.
 */
export async function retryErpJob(
  id: string,
): Promise<ClientResult<ErpJobRow>> {
  return adminApi<ErpJobRow>(`erp-sync/jobs/${encodeURIComponent(id)}/retry`, {
    method: "POST",
  });
}

/** CD-27 — รายการสินค้าจาก SAP ของบริษัทที่ทำงานอยู่. */
export interface CatalogStatus {
  total: number;
  active: number;
  /** null = ยังไม่เคยดึงจาก SAP. */
  lastSyncedAt: string | null;
}

export interface CatalogSyncResult {
  total: number;
  created: number;
  updated: number;
  deactivated: number;
}

export async function getCatalogStatus(): Promise<ClientResult<CatalogStatus>> {
  return adminApi<CatalogStatus>("erp-sync/products/status");
}

/** ดึงจาก SAP ตอนนี้ — รอผล (ขึ้นกับขนาดรายการใน SAP). */
export async function syncCatalog(): Promise<ClientResult<CatalogSyncResult>> {
  return adminApi<CatalogSyncResult>("erp-sync/products/sync", {
    method: "POST",
  });
}

/** Grouped for `import erpSync from …` at call sites. */
const erpSync = { listErpJobs, retryErpJob, getCatalogStatus, syncCatalog };

export default erpSync;
