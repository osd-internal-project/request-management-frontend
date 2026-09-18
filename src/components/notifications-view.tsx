"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Pagination,
  Segmented,
  Space,
  Switch,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  NotificationList,
  notificationHref,
} from "@/components/notification-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  AppNotification,
  NotificationPreferences,
} from "@/lib/api/types";

const mn = messages.notifications;

type Filter = "all" | "unread";

/**
 * หน้ารวมการแจ้งเตือน — ตัวกรองและหน้าอยู่ใน URL (server page อ่านใหม่ทุกครั้ง),
 * การกดอ่าน/อ่านทั้งหมดเรียก backend แล้ว `router.refresh()`.
 */
export function NotificationsView({
  rows,
  total,
  loadError,
  unreadCount,
  unreadOnly,
  page,
  pageSize,
  preferences,
}: {
  rows: AppNotification[];
  total: number;
  loadError: string | null;
  unreadCount: number;
  unreadOnly: boolean;
  page: number;
  pageSize: number;
  /** null = could not be read; the card is hidden rather than shown wrong. */
  preferences: NotificationPreferences | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(loadError);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(preferences?.email ?? true);

  function navigate(next: { filter?: Filter; page?: number }) {
    const filter = next.filter ?? (unreadOnly ? "unread" : "all");
    const params = new URLSearchParams();
    if (filter === "unread") params.set("unread", "true");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    router.push(qs ? `${ROUTES.notifications}?${qs}` : ROUTES.notifications);
  }

  async function open(notification: AppNotification) {
    if (!notification.readAt) {
      const result = await appApi(`notifications/${notification.id}/read`, {
        method: "POST",
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
    }
    const href = notificationHref(notification);
    if (href) router.push(href);
    else router.refresh();
  }

  async function markAllRead() {
    setBusy(true);
    const result = await appApi("notifications/read-all", { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(mn.allMarked);
    router.refresh();
  }

  async function saveEmail(next: boolean) {
    setEmail(next);
    const result = await appApi("notifications/preferences", {
      method: "PUT",
      body: JSON.stringify({ email: next }),
    });
    if (!result.ok) {
      setEmail(!next);
      setError(result.message);
      return;
    }
    message.success(mn.preferences.saved);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <Card
        size="small"
        title={
          <Space size={8} wrap>
            <Segmented<Filter>
              size="small"
              value={unreadOnly ? "unread" : "all"}
              onChange={(value) => navigate({ filter: value, page: 1 })}
              options={[
                { value: "all", label: mn.filter.all },
                { value: "unread", label: mn.filter.unread },
              ]}
            />
            <Text type="secondary" className="text-xs font-normal">
              {mn.unreadCount(unreadCount)}
            </Text>
          </Space>
        }
        extra={
          unreadCount > 0 ? (
            <Button size="small" loading={busy} onClick={() => void markAllRead()}>
              {mn.markAllRead}
            </Button>
          ) : undefined
        }
      >
        {error && <Alert type="error" showIcon title={error} className="mb-3" />}
        <NotificationList
          notifications={rows}
          emptyText={unreadOnly ? mn.emptyUnread : mn.empty}
          onOpen={(notification) => void open(notification)}
        />
        {total > pageSize && (
          <Pagination
            className="mt-3 text-right"
            size="small"
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(next) => navigate({ page: next })}
          />
        )}
      </Card>

      {preferences && (
        <Card size="small" title={mn.preferences.title} className="self-start">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{mn.preferences.inApp}</span>
              <Switch size="small" checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <span>{mn.preferences.email}</span>
              <Switch
                size="small"
                checked={email}
                onChange={(next) => void saveEmail(next)}
              />
            </div>
            {!preferences.email_delivery_available && (
              <Text type="secondary" className="block text-xs">
                {mn.preferences.emailUnavailable}
              </Text>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
