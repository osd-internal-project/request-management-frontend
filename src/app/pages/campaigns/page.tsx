import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CampaignList } from "@/components/crm/campaigns/campaign-list";
import { getCampaigns } from "@/lib/api/campaigns";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.campaigns;

/** CD-71 — แคมเปญพร้อมผลถึงยอดขาย; ผู้มี `crm.campaign.manage` สร้าง/แก้/ปิดได้. */
export default async function CampaignsPage() {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const result = await getCampaigns();

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
        <div>
          <Text type="secondary" className="text-xs">
            {m.scopeNote}
          </Text>
        </div>
      </div>

      {result.ok ? (
        <CampaignList
          rows={result.data}
          canManage={can(session, "crm.campaign.manage")}
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
