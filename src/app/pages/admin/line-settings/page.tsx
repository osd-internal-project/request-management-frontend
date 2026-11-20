import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LineSettingsAdmin } from "@/components/admin/line-settings-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** LINE ของบริษัท — LINE Login channel ที่พนักงานใช้ผูก LINE (`admin.integration.manage`). */
export default async function AdminLineSettingsPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.lineSettings.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.lineSettings.subtitle}
        </Text>
      </div>

      <LineSettingsAdmin />
    </div>
  );
}
