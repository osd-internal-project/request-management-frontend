"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Badge, Button, Popover, Spin } from "antd";
import { BellOutlined } from "@ant-design/icons";
import {
  NotificationList,
  notificationHref,
} from "@/components/notification-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { AppNotification, Paginated } from "@/lib/api/types";

const mn = messages.notifications;

/** Often enough that an alert shows up while someone is working; cheap: one COUNT. */
const POLL_MS = 60_000;
const DROPDOWN_SIZE = 8;

/**
 * SUP-03 — the bell in the header. The count is polled; the list is fetched
 * only when the dropdown opens, so an idle tab costs one COUNT a minute.
 */
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AppNotification[]>([]);

  const refreshCount = useCallback(async () => {
    const result = await appApi<{ count: number }>("notifications/unread-count");
    if (result.ok) setCount(result.data.count);
  }, []);

  // Re-count on navigation too: opening the thing a notification pointed at
  // is usually when it was read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), POLL_MS);
    return () => clearInterval(timer);
  }, [refreshCount, pathname]);

  async function loadLatest() {
    setLoading(true);
    setError(null);
    const result = await appApi<Paginated<AppNotification>>(
      `notifications?page=1&page_size=${DROPDOWN_SIZE}`,
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRows(result.data.data);
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) {
      await appApi(`notifications/${notification.id}/read`, { method: "POST" });
      setCount((current) => Math.max(0, current - 1));
    }
    setOpen(false);
    const href = notificationHref(notification);
    if (href) router.push(href);
  }

  async function markAllRead() {
    const result = await appApi("notifications/read-all", { method: "POST" });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCount(0);
    const now = new Date().toISOString();
    setRows((current) => current.map((row) => ({ ...row, readAt: row.readAt ?? now })));
  }

  const content = (
    <div className="w-80 max-w-[calc(100vw-32px)]">
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-sm font-semibold">{mn.latest}</span>
        {count > 0 && (
          <Button type="link" size="small" onClick={() => void markAllRead()}>
            {mn.markAllRead}
          </Button>
        )}
      </div>
      {error && <Alert type="error" showIcon title={error} className="mb-2" />}
      {loading ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <NotificationList
            notifications={rows}
            emptyText={mn.empty}
            onOpen={(notification) => void openNotification(notification)}
            compact
          />
        </div>
      )}
      <div className="mt-1 border-t border-gray-100 pt-2 text-center">
        <Link href={ROUTES.notifications} onClick={() => setOpen(false)}>
          {mn.viewAll}
        </Link>
      </div>
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void loadLatest();
      }}
      content={content}
    >
      <button
        type="button"
        aria-label={mn.bellLabel}
        className="flex cursor-pointer items-center border-0 bg-transparent p-1"
      >
        <Badge count={count} size="small" overflowCount={99}>
          <BellOutlined className="text-lg text-gray-600" />
        </Badge>
      </button>
    </Popover>
  );
}
