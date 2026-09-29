import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { PortfolioView } from "@/components/crm/keeper/portfolio-view";
import { getPortfolio } from "@/lib/api/keeper";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.keeper;

/** CD-86 — Portfolio ลูกค้าเดิมของแกน Keeper. Gate-before-fetch. */
export default async function KeeperPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    tier?: string;
    health?: string;
    search?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.customer.read")) redirect(HOME_PATH);

  const query = await searchParams;
  // "ของฉัน" first: a Keeper opens their own book.
  const view = query.view === "team" ? "team" : "mine";
  const result = await getPortfolio({
    view,
    tier: query.tier,
    health: query.health,
    search: query.search,
  });

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      {result.ok ? (
        <PortfolioView
          portfolio={result.data}
          filters={{
            view,
            tier: query.tier,
            health: query.health,
            search: query.search,
          }}
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
