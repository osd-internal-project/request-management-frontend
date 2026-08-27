import { Alert, Card, Empty, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { AuditFilters } from "@/components/audit-filters";
import { AuditTable } from "@/components/audit-table";
import audit from "@/lib/api/audit";
import { messages } from "@/lib/messages";

/** Only the filters §11.7 declares — anything else is dropped, not passed on. */
function toQuery(params: Record<string, string | string[] | undefined>) {
  const single = (key: string): string | undefined => {
    const value = params[key];

    return Array.isArray(value) ? value[0] : value;
  };

  return {
    page: Number(single("page") ?? 1),
    page_size: 50,
    actor_id: single("actor_id"),
    event_type: single("event_type"),
    resource_type: single("resource_type"),
    resource_id: single("resource_id"),
    from: single("from"),
    to: single("to"),
  };
}

/**
 * SUP-04 — the audit log, read-only.
 *
 * There is no edit or delete affordance here because the API has no such
 * endpoint: the log is append-only, and this screen is the auditor's window
 * onto it.
 *
 * Filters are read from the URL and applied by this server component, so a
 * filtered view is a link someone can send. The table itself is a client
 * component: antd's `columns` carry `render` callbacks, and a server component
 * cannot pass functions across the client boundary.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = toQuery(await searchParams);
  const result = await audit.getAuditLogs(query);

  // Suggestions for the two free-text filters, taken from what came back.
  // Deliberately not a fixed list: the event catalog is declared in code across
  // both services and has no endpoint, so a hardcoded copy would go stale and
  // hide the events it had not heard of.
  const rows = result.ok ? result.data.data : [];
  const eventTypes = [...new Set(rows.map((row) => row.eventType))].sort();
  const resourceTypes = [
    ...new Set(
      rows
        .map((row) => row.resourceType)
        .filter((type): type is string => Boolean(type)),
    ),
  ].sort();

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.audit.title}
        </Title>
        <Text type="secondary">{messages.audit.subtitle}</Text>
      </div>

      {!result.ok ? (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      ) : (
        <Card>
          <Space orientation="vertical" size="middle" className="flex">
            <AuditFilters
              eventTypes={eventTypes}
              resourceTypes={resourceTypes}
            />

            <Text type="secondary" className="text-xs">
              {messages.audit.resultCount(result.data.total)}
            </Text>

            {result.data.data.length ? (
              <AuditTable
                rows={result.data.data}
                page={result.data.page}
                pageSize={result.data.page_size}
                total={result.data.total}
              />
            ) : (
              <Empty description={messages.audit.empty} />
            )}

            <Paragraph type="secondary" className="mb-0! text-xs">
              {messages.audit.appendOnly}
            </Paragraph>
          </Space>
        </Card>
      )}
    </div>
  );
}
