import { Alert, Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { NotificationLog } from "@/components/admin/notification-log";
import {
  getNotificationLog,
  NOTIFICATION_LOG_FILTERS,
  type NotificationLogQuery,
} from "@/lib/api/notification-log";
import { messages } from "@/lib/messages";

/** Only the filters the API declares — anything else in the URL is dropped. */
function toQuery(
  params: Record<string, string | string[] | undefined>,
): NotificationLogQuery {
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const query: NotificationLogQuery = { page: Number(single("page") ?? 1) };
  for (const key of NOTIFICATION_LOG_FILTERS) query[key] = single(key);
  return query;
}

/**
 * CD-55 — บันทึกการแจ้งเตือน, for `audit.read` (the menu entry and the API
 * both ask for it). Read-only: there is nothing here to edit or remove.
 */
export default async function NotificationLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await getNotificationLog(toQuery(await searchParams));
  const rows = result.ok ? result.data.data : [];
  // Suggestions from what is on screen — the event catalog has no endpoint.
  const eventTypes = [...new Set(rows.map((row) => row.event_type))].sort();

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.notificationLog.title}
        </Title>
        <Text type="secondary">{messages.notificationLog.subtitle}</Text>
      </div>

      {result.ok ? (
        <Card>
          <NotificationLog
            rows={rows}
            page={result.data.page}
            pageSize={result.data.page_size}
            total={result.data.total}
            eventTypes={eventTypes}
          />
          <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
            {messages.notificationLog.readNote}
          </Paragraph>
        </Card>
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
