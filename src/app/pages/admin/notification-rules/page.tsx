import { Alert } from "antd";
import { NotificationRulesAdmin } from "@/components/admin/notification-rules-admin";
import { getNotificationRules } from "@/lib/api/notification-rules";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

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
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.notificationRules.title} subtitle={messages.notificationRules.subtitle(company?.name ?? "")} />
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
