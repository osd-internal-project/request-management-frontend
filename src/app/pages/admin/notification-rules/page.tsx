import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { NotificationRulesAdmin } from "@/components/admin/notification-rules-admin";
import { getNotificationRules } from "@/lib/api/notification-rules";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * CD-53 — กติกาแจ้งเตือนจากเหตุการณ์ของบริษัทที่เลือกอยู่
 * (`admin.notification.manage`). The header switcher reaches another
 * company's, as on every admin screen.
 */
export default async function NotificationRulesPage() {
  const [session, result] = await Promise.all([
    getSession(),
    getNotificationRules(),
  ]);
  const company = session?.companies.find(
    (entry) => entry.id === session.active_company_id,
  );

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.notificationRules.title}
        </Title>
        <Text type="secondary">
          {messages.notificationRules.subtitle(company?.name ?? "")}
        </Text>
      </div>
      {result.ok ? (
        <NotificationRulesAdmin initial={result.data} />
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
