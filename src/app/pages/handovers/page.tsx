import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { HandoverInbox } from "@/components/crm/handover/handover-inbox";
import { getHandover, getHandovers } from "@/lib/api/sales";
import { messages } from "@/lib/messages";

/**
 * CD-84 งานส่งมอบ — open to every signed-in user: the receiving team holds no
 * CRM permission, and the API itself answers only with handovers sent to the
 * viewer's own team (or sent by them). Nothing here needs a gate beyond that.
 */
export default async function HandoversPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string; status?: string; id?: string }>;
}) {
  const query = await searchParams;
  const box = query.box === "sent" ? "sent" : "incoming";
  const status = query.status || undefined;

  const [listResult, openedResult] = await Promise.all([
    getHandovers({ box, status }),
    query.id ? getHandover(query.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.handover.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.handover.subtitle}
        </Text>
      </div>

      {!listResult.ok && (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={listResult.error.message}
        />
      )}

      <HandoverInbox
        rows={listResult.ok ? listResult.data : []}
        box={box}
        status={status}
        opened={openedResult?.ok ? openedResult.data : null}
      />
    </div>
  );
}
