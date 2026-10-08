"use client";

import { Badge, Empty, Tag } from "antd";
import dayjs from "dayjs";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { AppNotification } from "@/lib/api/types";

const mn = messages.notifications;

/**
 * Where a notification leads. `approval_case` rows carry the case id, not the
 * request's — the work queue on the landing page is where a pending approval
 * is acted on, so that is where it goes. Unknown types lead nowhere rather
 * than to a guessed URL.
 */
export function notificationHref(notification: AppNotification): string | null {
  if (!notification.resourceId) return null;
  switch (notification.resourceType) {
    case "request":
      return ROUTES.requestDetail(notification.resourceId);
    case "opportunity":
      return ROUTES.opportunityDetail(notification.resourceId);
    case "approval_case":
      return ROUTES.myWork;
    case "contract_obligation":
      return ROUTES.obligations;
    // CD-14 — my turn to sign; for the sender, their list of signings
    case "esign_signer":
      return ROUTES.esignSign(notification.resourceId);
    case "esign_envelope":
      return ROUTES.contracts;
    case "customer_contract":
      return ROUTES.contractDetail(notification.resourceId);
    // การเบิก — the resource id is the document number
    case "disbursement":
      return ROUTES.disbursementDetail(notification.resourceId);
    // CD-175 — put on a project
    case "project":
      return ROUTES.projectDetail(notification.resourceId);
    // CD-256 — the overdue-installments digest
    case "delivery_report":
      return `${ROUTES.deliveryReport}?tab=${notification.resourceId}`;
    // CD-260 — a knowledge article to review, or what came of it
    case "kb_article":
      return ROUTES.kbArticle(notification.resourceId);
    // CD-266 — a knowledge gap handed to me, or overdue
    case "kb_gap":
      return `${ROUTES.kbGaps}?id=${notification.resourceId}`;
    // CD-283 — a customer waits for a person
    case "care_conversation":
      return `${ROUTES.careConversations}?id=${notification.resourceId}`;
    case "sales_handover":
      return `${ROUTES.handovers}?id=${notification.resourceId}`;
    default:
      return null;
  }
}

export function formatNotificationTime(iso: string): string {
  const at = dayjs(iso);
  return at.isSame(dayjs(), "day")
    ? at.format("HH:mm")
    : at.format("D MMM YY HH:mm");
}

/**
 * Rows for both the bell dropdown and the notifications page. Unread rows are
 * bold with a dot; clicking is the caller's business (mark read, navigate).
 */
export function NotificationList({
  notifications,
  emptyText,
  onOpen,
  compact = false,
}: {
  notifications: AppNotification[];
  emptyText: string;
  onOpen: (notification: AppNotification) => void;
  compact?: boolean;
}) {
  if (!notifications.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => {
        const unread = !notification.readAt;
        const resource = notification.resourceType
          ? mn.resource[notification.resourceType]
          : undefined;

        return (
          <button
            key={notification.id}
            type="button"
            onClick={() => onOpen(notification)}
            className={`flex w-full cursor-pointer items-start gap-2 px-2 py-2 text-left hover:bg-gray-50 ${
              unread ? "bg-blue-50/40" : ""
            }`}
          >
            <span className="pt-1.5">
              <Badge status={unread ? "processing" : "default"} />
            </span>
            <span className="min-w-0 grow">
              <span
                className={`block text-sm ${unread ? "font-semibold" : "text-gray-600"}`}
              >
                {notification.title}
              </span>
              <span
                // pre-line: the CD-52 daily digest lists one item per line.
                className={`block text-xs whitespace-pre-line text-gray-500 ${compact ? "line-clamp-2" : ""}`}
              >
                {notification.body}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                {resource && <Tag className="mr-0! text-xs">{resource}</Tag>}
                {formatNotificationTime(notification.createdAt)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
