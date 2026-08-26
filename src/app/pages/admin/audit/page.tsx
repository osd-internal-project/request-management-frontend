import { Alert, Card, Empty } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { AuditTable } from "@/components/audit-table";
import audit from "@/lib/api/audit";
import { messages } from "@/lib/messages";

/**
 * SUP-04 — the audit log, read-only.
 *
 * There is no edit or delete affordance here because the API has no such
 * endpoint: the log is append-only, and this screen is the auditor's window
 * onto it.
 *
 * The table itself is a client component: antd's `columns` carry `render`
 * callbacks, and a server component cannot pass functions across the client
 * boundary.
 */
export default async function AdminAuditPage() {
  const result = await audit.getAuditLogs({ page: 1, page_size: 50 });

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
        </Card>
      )}
    </div>
  );
}
