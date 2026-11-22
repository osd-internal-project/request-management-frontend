import { redirect } from "next/navigation";
import { ErpSyncAdmin, ProductCatalogCard } from "@/components/admin/erp-sync-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

/**
 * คิวส่ง SAP (`admin.integration.manage`) — CM-06 / CD-88.
 *
 * งานที่ SAP ปฏิเสธหรือเข้าไม่ถึงครบรอบจะหยุดลองเอง; หน้านี้ให้ผู้ดูแลเห็นข้อผิดพลาด
 * ตามที่ SAP ตอบ แก้ต้นเหตุ แล้วกดส่งใหม่ — แทนการเข้าไปแก้ฐานข้อมูลตรง
 */
export default async function AdminErpSyncPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.erpSync.title} subtitle={messages.erpSync.subtitle} />

      <ErpSyncAdmin />

      <ProductCatalogCard />
    </div>
  );
}
