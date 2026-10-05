import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";
import { HandoverInbox } from "@/components/delivery/handover-inbox";

const m = messages.delivery.handover;

/** CD-255 — what the delivery team handed the service team. */
export default async function DeliveryHandoversPage() {
  const session = await getSession();
  if (
    !canAny(session, [
      "service.asset.read",
      "service.asset.manage",
      "delivery.read",
      "delivery.manage",
    ])
  )
    redirect(HOME_PATH);
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.inboxTitle}
        </Title>
        <Text type="secondary">{m.inboxHint}</Text>
      </div>
      <Card>
        <HandoverInbox />
      </Card>
    </div>
  );
}
