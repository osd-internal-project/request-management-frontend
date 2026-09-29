import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { VisitLogForm } from "@/components/crm/opportunities/visit-log-form";
import { getOpportunities } from "@/lib/api/sales";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * CD-75 — บันทึกการเข้าพบ, built for the phone. The deals offered are the
 * viewer's own open ones; `?opportunity=<id>` preselects one (the link on a
 * deal page).
 */
export default async function VisitLogPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.manage")) redirect(HOME_PATH);
  const { opportunity } = await searchParams;

  const deals = await getOpportunities({
    open: true,
    view: "mine",
    page_size: 100,
  });

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md">
        <Title level={4} className="mb-0!">
          {messages.visitLog.title}
        </Title>
        <Text type="secondary">{messages.visitLog.subtitle}</Text>
      </div>
      {deals.ok ? (
        <VisitLogForm deals={deals.data.data} initialDealId={opportunity} />
      ) : (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={deals.error.message}
        />
      )}
    </div>
  );
}
