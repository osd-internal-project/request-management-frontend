import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { NotificationTemplatesAdmin } from "@/components/admin/notification-templates-admin";
import { getNotificationTemplates } from "@/lib/api/notification-templates";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * CD-54 — ถ้อยคำการแจ้งเตือนของบริษัทที่เลือกอยู่ (`admin.notification.manage`).
 * The header switcher reaches another company's, as on every admin screen.
 */
export default async function NotificationTemplatesPage() {
  const [session, result] = await Promise.all([
    getSession(),
    getNotificationTemplates(),
  ]);
  const company = session?.companies.find(
    (entry) => entry.id === session.active_company_id,
  );

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.notificationTemplates.title}
        </Title>
        <Text type="secondary">
          {messages.notificationTemplates.subtitle(company?.name ?? "")}
        </Text>
      </div>
      {result.ok ? (
        <NotificationTemplatesAdmin
          initial={result.data}
          companyName={company?.name ?? ""}
        />
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
