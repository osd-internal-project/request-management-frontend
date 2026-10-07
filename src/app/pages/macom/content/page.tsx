import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ContentCalendar } from "@/components/macom/content-calendar";
import { getCampaigns } from "@/lib/api/campaigns";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.content;

/**
 * CD-271 — the content calendar: what goes out where and when. Everyone in
 * sales can look; the MACOM team (`crm.campaign.manage`) plans and edits.
 */
export default async function ContentCalendarPage() {
  const session = await getSession();
  const canManage = can(session, "crm.campaign.manage");
  if (!can(session, "crm.sales.read") && !canManage) redirect(HOME_PATH);

  const [campaigns, users] = await Promise.all([
    can(session, "crm.sales.read") ? getCampaigns() : null,
    canManage ? getAllDirectoryUsers() : null,
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <ContentCalendar
        canManage={canManage}
        me={session?.user.id ?? ""}
        campaigns={
          campaigns?.ok
            ? campaigns.data.map((row) => ({ id: row.id, name: row.name }))
            : []
        }
        people={
          users?.ok
            ? users.data.map((user) => ({
                id: user.id,
                name: user.displayName,
              }))
            : []
        }
      />
    </div>
  );
}
