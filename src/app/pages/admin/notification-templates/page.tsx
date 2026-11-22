import { Alert } from "antd";
import { NotificationTemplatesAdmin } from "@/components/admin/notification-templates-admin";
import { getNotificationTemplates } from "@/lib/api/notification-templates";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

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
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.notificationTemplates.title} subtitle={messages.notificationTemplates.subtitle(company?.name ?? "")} />
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
