import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CustomerImport } from "@/components/crm/customers/customer-import";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * CM-10 — นำเข้าลูกค้าเดิมจาก Excel (spec artifact 856c08fd, Jira CD-129).
 * Admin surface: gate-before-render on `admin.crm.manage`; the client
 * component parses the file and the backend re-validates every row.
 */
export default async function CustomerImportPage() {
  const session = await getSession();
  if (!can(session, "admin.crm.manage")) redirect(HOME_PATH);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.customers.importer.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.customers.importer.subtitle}
        </Text>
      </div>
      <CustomerImport />
    </div>
  );
}
