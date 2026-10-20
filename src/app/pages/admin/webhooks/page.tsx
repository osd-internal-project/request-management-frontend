import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { WebhookAdmin } from "@/components/admin/webhook-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** Webhook ขาออกของบริษัท (`admin.integration.manage`, G-07). */
export default async function AdminWebhooksPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.webhooks.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.webhooks.subtitle}
        </Text>
      </div>

      <WebhookAdmin />
    </div>
  );
}
