/**
 * สินค้า/บริการจาก SAP — CD-27 (24 ก.ย. 2569)
 *
 * Database: products (สำเนาจาก SAP B1 `Items` ต่อบริษัท, อ่านอย่างเดียว)
 * Services: core-service — `/products`
 *
 * ค้นจากสำเนาที่ Connect the Dot เท่านั้น ใช้ได้แม้ SAP ล่ม
 */

import { appApi, type ClientResult } from "../client";

export interface ProductRow {
  /** SAP ItemCode — ค่าที่ใส่ในรหัสสินค้าของบรรทัด. */
  code: string;
  name: string;
  unit: string | null;
  active: boolean;
}

export async function searchProducts(
  search: string,
): Promise<ClientResult<ProductRow[]>> {
  const query = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";
  return appApi<ProductRow[]>(`products${query}`);
}

/** ยังไม่มี ERP — ฝ่ายราคาเพิ่มสินค้าเอง (สิทธิ์ `pricing.price.manage`). */
export async function createProduct(input: {
  code: string;
  name: string;
  unit?: string;
}): Promise<ClientResult<ProductRow>> {
  return appApi<ProductRow>("products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** สินค้าที่กรอกเอง — มี `id` สำหรับแก้ชื่อ/ลบ. */
export interface ManualProduct extends ProductRow {
  id: string;
}

export async function listManualProducts(): Promise<
  ClientResult<ManualProduct[]>
> {
  return appApi<ManualProduct[]>("products/manual");
}

/** แก้ชื่อ/หน่วย — รหัสแก้ไม่ได้ (ราคา ต้นทุน และเอกสารอ้างรหัส). */
export async function updateProduct(
  id: string,
  input: { name: string; unit: string },
): Promise<ClientResult<ManualProduct>> {
  return appApi<ManualProduct>(`products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** ลบ = เลิกขาย: หายจากช่องค้น เอกสารเก่ายังอ้างรหัสได้. */
export async function removeProduct(
  id: string,
): Promise<ClientResult<{ id: string }>> {
  return appApi<{ id: string }>(`products/${id}`, { method: "DELETE" });
}

/** Grouped for `import products from …` at call sites. */
const products = {
  searchProducts,
  createProduct,
  listManualProducts,
  updateProduct,
  removeProduct,
};

export default products;
