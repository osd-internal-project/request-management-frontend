import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CampaignResults } from "@/components/macom/campaign-results";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";

const m = messages.campaignResults;

/**
 * CD-274 — campaign results to real revenue, from the Data Mart. Company-wide
 * money: MACOM and the executives only.
 */
export default async function CampaignResultsPage() {
  const session = await getSession();
  if (!canAny(session, ["crm.campaign.manage", "report.dashboard.read"])) {
    redirect(HOME_PATH);
  }
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <CampaignResults />
    </div>
  );
}
