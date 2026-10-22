import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { IntegrationList } from "@/components/admin/integrations/integration-list";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** ระบบภายนอก — ที่เดียวของกุญแจ API, webhook และ MCP (`admin.integration.manage`). */
export default async function AdminIntegrationsPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.integrations.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.integrations.subtitle}
        </Text>
      </div>

      <IntegrationList />
    </div>
  );
}
