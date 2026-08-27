import { Alert, Card, Empty } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { BottleneckTable } from "@/components/bottleneck-table";
import { getBottleneck } from "@/lib/api/reports";
import { messages } from "@/lib/messages";

/**
 * REQ-09 — where requests actually wait.
 *
 * Rows arrive slowest-first from the server, so the answer to "where is the
 * queue" is the top of the table without anyone sorting it.
 */
export default async function BottleneckReportPage() {
  const result = await getBottleneck();

  if (!result.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={result.error.message}
      />
    );
  }

  const rows = result.data;

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.bottleneck.title}
        </Title>
        <Text type="secondary">{messages.bottleneck.subtitle}</Text>
      </div>

      <Card>
        {rows.length ? (
          <BottleneckTable rows={rows} />
        ) : (
          <Empty description={messages.bottleneck.empty} />
        )}

        <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
          {messages.bottleneck.pendingNote}
        </Paragraph>
      </Card>
    </div>
  );
}
