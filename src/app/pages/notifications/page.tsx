import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { NotificationsView } from "@/components/notifications/notifications-view";
import {
  getNotificationPreferences,
  getNotifications,
  getUnreadCount,
} from "@/lib/api/notifications";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const PAGE_SIZE = 20;

/** SUP-03 กล่องแจ้งเตือน — ของผู้ใช้ในบริษัทที่เลือกอยู่. Gate-before-fetch. */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ unread?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const unreadOnly = query.unread === "true";
  const page = Number(query.page) || 1;

  const [listResult, countResult, preferencesResult] = await Promise.all([
    getNotifications({ unread: unreadOnly, page, page_size: PAGE_SIZE }),
    getUnreadCount(),
    getNotificationPreferences(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.notifications.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.notifications.scopeNote}
        </Text>
      </div>

      <NotificationsView
        rows={listResult.ok ? listResult.data.data : []}
        total={listResult.ok ? listResult.data.total : 0}
        loadError={listResult.ok ? null : listResult.error.message}
        unreadCount={countResult.ok ? countResult.data.count : 0}
        unreadOnly={unreadOnly}
        page={page}
        pageSize={PAGE_SIZE}
        preferences={preferencesResult.ok ? preferencesResult.data : null}
      />
    </div>
  );
}
