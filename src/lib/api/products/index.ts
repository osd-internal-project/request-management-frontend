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

export async function searchProducts(search: string): Promise<ClientResult<ProductRow[]>> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return appApi<ProductRow[]>(`products${query}`);
}

/** Grouped for `import products from …` at call sites. */
const products = { searchProducts };

export default products;
