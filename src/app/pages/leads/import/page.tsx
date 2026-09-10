import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LeadImport } from "@/components/lead-import";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * นำเข้า Lead จาก Excel — สูตรเดียวกับ CM-10 (import ลูกค้า) แต่เป็นงานฝ่ายขาย:
 * gate ด้วย `crm.sales.manage` ไม่ใช่ admin; backend ตรวจซ้ำ (อีเมล/เบอร์) และ
 * re-validate ทุกแถว.
 */
export default async function LeadImportPage() {
  const session = await getSession();
  if (!can(session, "crm.sales.manage")) redirect(HOME_PATH);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.sales.leads.importer.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.sales.leads.importer.subtitle}
        </Text>
      </div>
      <LeadImport />
    </div>
  );
}
