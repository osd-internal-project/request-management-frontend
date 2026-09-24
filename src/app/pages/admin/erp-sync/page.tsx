import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ErpSyncAdmin, ProductCatalogCard } from "@/components/admin/erp-sync-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

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
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.erpSync.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.erpSync.subtitle}
        </Text>
      </div>

      <ErpSyncAdmin />

      <ProductCatalogCard />
    </div>
  );
}
