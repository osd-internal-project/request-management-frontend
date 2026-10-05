import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { canAny, getSession } from "@/lib/session";
import { DeliveryReport } from "@/components/delivery/delivery-report";

const m = messages.delivery.report;

/**
 * CD-256 — the delivery report. Phases and acceptance for the delivery team,
 * PM and finance; installments past due for finance (every contract) and
 * for salespeople (their own).
 */
export default async function DeliveryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  const { tab } = await searchParams;
  const canPhases = canAny(session, [
    "delivery.read",
    "delivery.manage",
    "delivery.receivable.read",
    "pm.project.read",
  ]);
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <DeliveryReport canPhases={canPhases} initialTab={tab} />
      </Card>
    </div>
  );
}
