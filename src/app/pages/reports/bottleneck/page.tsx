import { Alert, Card, Empty } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { BottleneckTable } from "@/components/reports/bottleneck-table";
import { BottleneckFilters } from "@/components/reports/bottleneck-filters";
import { getBottleneck } from "@/lib/api/reports";
import requests from "@/lib/api/requests";
import { messages } from "@/lib/messages";

/**
 * REQ-09 — where requests actually wait.
 *
 * Rows arrive slowest-first from the server, so the answer to "where is the
 * queue" is the top of the table without anyone sorting it.
 */
export default async function BottleneckReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type_code?: string; from?: string; to?: string }>;
}) {
  const filters = await searchParams;

  // Filters are the API's (`BottleneckQueryDto` declares them); the page only
  // carries them from the URL. Nothing is narrowed in the browser, because the
  // server has already aggregated by the time we see a row.
  const [result, types] = await Promise.all([
    getBottleneck(filters),
    requests.getRequestTypes(),
  ]);

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
        {/* SCOPE-02: the report measures only requests this viewer can see, so
            a smaller table than a colleague's is the truth, not a fault. */}
        <div>
          <Text type="secondary" className="text-xs">
            {messages.bottleneck.scopeNote}
          </Text>
        </div>
      </div>

      <BottleneckFilters
        types={types.ok ? types.data : []}
        filters={filters}
      />

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
