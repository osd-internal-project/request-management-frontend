import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { BrandLibrary } from "@/components/macom/brand-library";
import { messages } from "@/lib/messages";
import { can, getSession } from "@/lib/session";

const m = messages.brand;

/**
 * CD-273 — the brand library. Every member of staff takes the current
 * logos, templates and decks from here; MACOM (`crm.campaign.manage`) adds
 * versions (each approved before it shows) and keeps the history.
 */
export default async function BrandLibraryPage() {
  const session = await getSession();
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <BrandLibrary canManage={can(session, "crm.campaign.manage")} />
    </div>
  );
}
