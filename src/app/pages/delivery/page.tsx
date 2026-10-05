import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";
import { DeliveryBoard } from "@/components/delivery/delivery-board";

const m = messages.delivery;

/** Bangkok today, and eight weeks ahead. */
function eightWeeks() {
  const today = new Date(Date.now() + 7 * 3_600_000);
  const later = new Date(today.getTime() + 56 * 86_400_000);
  return {
    from: today.toISOString().slice(0, 10),
    to: later.toISOString().slice(0, 10),
  };
}

/** CD-250 — the delivery team's board across projects. */
export default async function DeliveryPage() {
  const session = await getSession();
  if (!canAny(session, ["delivery.read", "delivery.manage", "pm.project.read"]))
    redirect(HOME_PATH);
  const { from, to } = eightWeeks();
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.boardTitle}
        </Title>
        <Text type="secondary">{m.boardHint}</Text>
      </div>
      <Card>
        <DeliveryBoard from={from} to={to} />
      </Card>
    </div>
  );
}
