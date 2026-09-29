import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { IntakeChannelsAdmin } from "@/components/admin/intake-channels-admin";
import { getAdminRequestTypes } from "@/lib/api/admin";
import { getIntakeChannels } from "@/lib/api/intake-channels";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * CD-66 — ช่องทางรับคำขอจากลูกค้า of the company selected in the header: which
 * channels are open, who stands as requester, which request types each offers.
 */
export default async function IntakeChannelsPage() {
  const [session, result, types, users] = await Promise.all([
    getSession(),
    getIntakeChannels(),
    getAdminRequestTypes(),
    getAllDirectoryUsers(),
  ]);
  const company = session?.companies.find(
    (entry) => entry.id === session.active_company_id,
  );

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.intakeChannels.title}
        </Title>
        <Text type="secondary">
          {messages.intakeChannels.subtitle(company?.name ?? "")}
        </Text>
      </div>
      {result.ok ? (
        <IntakeChannelsAdmin
          initial={result.data}
          types={(types.ok ? types.data : []).map((type) => ({
            code: type.code,
            name: type.name,
          }))}
          people={(users.ok ? users.data : []).map((user) => ({
            id: user.id,
            name: user.displayName,
            detail: user.position ?? user.email ?? "",
          }))}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      )}
    </div>
  );
}
