"use client";

import Link from "next/link";
import { Alert, Button, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { STATUS_COLOR } from "@/components/requests/my-work";
import {
  missingRequiredSubRequests,
  type NamedSubRequestType,
  type RequestTreeNode,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

/**
 * The type's sub-request checklist on the detail page: what to raise, what
 * already was, and — for whoever carries the request — a button per missing item.
 */
export function SubRequestChecklist({
  requestId,
  items,
  childRequests,
  canCreate,
}: {
  readonly requestId: string;
  readonly items: readonly NamedSubRequestType[];
  /** Direct children only; the server counts nothing deeper. */
  readonly childRequests: readonly RequestTreeNode[];
  readonly canCreate: boolean;
}) {
  const missing = missingRequiredSubRequests(items, childRequests);
  const t = messages.requestDetail;

  return (
    <Alert
      type={missing.length ? "warning" : "success"}
      showIcon
      title={missing.length ? t.subRequestsMissing(missing.length) : t.subRequestsDone}
      description={
        <ul className="m-0 mt-2 list-none space-y-2 p-0">
          {items.map((item) => {
            const raised = childRequests.filter(
              (child) => child.typeCode === item.code && child.status !== "cancelled",
            );
            return (
              <li key={item.code} className="flex flex-wrap items-center gap-2">
                <Text strong>{item.name}</Text>
                <Tag className="m-0!" color={item.required ? "red" : "default"}>
                  {item.required ? t.subRequestRequired : t.subRequestOptional}
                </Tag>
                {raised.map((child) => (
                  <Link key={child.id} href={ROUTES.requestDetail(child.id)}>
                    <Tag className="m-0! cursor-pointer" color={STATUS_COLOR[child.status]}>
                      {child.requestNo ?? messages.myWork.status.draft} ·{" "}
                      {messages.myWork.status[child.status] ?? child.status}
                    </Tag>
                  </Link>
                ))}
                {!raised.length && !canCreate && (
                  <Text type="secondary">{t.subRequestNotYet}</Text>
                )}
                {canCreate && (
                  <Link
                    href={`${ROUTES.newRequest}?parent=${requestId}&type=${encodeURIComponent(item.code)}`}
                  >
                    <Button size="small" type={raised.length ? "link" : "primary"} ghost={!raised.length}>
                      {raised.length ? t.subRequestCreateAnother : t.subRequestCreate}
                    </Button>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      }
    />
  );
}
