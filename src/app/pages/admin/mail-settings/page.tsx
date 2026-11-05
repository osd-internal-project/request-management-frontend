import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { MailSettingsAdmin } from "@/components/admin/mail-settings-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** อีเมลงานขาย — mailbox + Microsoft Graph ต่อบริษัท (`admin.integration.manage`). */
export default async function AdminMailSettingsPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.mailSettings.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.mailSettings.subtitle}
        </Text>
      </div>

      <MailSettingsAdmin />
    </div>
  );
}
