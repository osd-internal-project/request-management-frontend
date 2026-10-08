import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { SmartLeads } from "@/components/smart/smart-leads";
import { SmartResults } from "@/components/smart/smart-results";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.aiSmart;

/** CD-289 (CD-16 AI SMART) — sweep sources and what they found. */
export default async function AiSmartPage() {
  const session = await getSession();
  const canRead = can(session, "smart.prospect.read");
  // CD-295 — with only the dashboards right, the results alone.
  if (!canRead && !can(session, "report.dashboard.read")) redirect(HOME_PATH);
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      {canRead ? (
        <SmartLeads
          canManage={can(session, "smart.prospect.manage")}
          canCall={can(session, "smart.call.manage")}
          canCertify={can(session, "legal.contract.manage")}
          canOptOut={can(session, "crm.contact.optout.manage")}
        />
      ) : (
        <SmartResults />
      )}
    </div>
  );
}
