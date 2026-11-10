import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { SoftphoneSettings } from "@/components/admin/softphone/softphone-settings";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.softphone;

/** Each user's softphone extension (`admin.softphone.manage`). */
export default async function SoftphonePage() {
  const session = await getSession();
  if (!can(session, "admin.softphone.manage")) redirect(HOME_PATH);

  const users = await getAllDirectoryUsers();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <SoftphoneSettings
        users={(users.ok ? users.data : []).map((user) => ({
          id: user.id,
          name: user.displayName,
        }))}
      />
    </div>
  );
}
