import { Alert } from "antd";
import { IntakeChannelsAdmin } from "@/components/admin/intake-channels-admin";
import { getAdminRequestTypes } from "@/lib/api/admin";
import { getIntakeChannels } from "@/lib/api/intake-channels";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

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
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.intakeChannels.title} subtitle={messages.intakeChannels.subtitle(company?.name ?? "")} />
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
