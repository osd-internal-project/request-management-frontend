import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { IntegrationList } from "@/components/admin/integrations/integration-list";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

/** Hub — every company's integrations and the shared ones (`system.integration.manage`). */
export default async function SystemIntegrationsPage() {
  const session = await getSession();
  if (!canSystem(session, "system.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.integrations.hub.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.integrations.hub.subtitle}
        </Text>
      </div>
      <IntegrationList scope="system" />
    </div>
  );
}
