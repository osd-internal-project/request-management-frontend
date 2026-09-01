"use client";

import Link from "next/link";
import { Empty, Tag } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import { STATUS_COLOR } from "@/components/my-work";
import type { RequestTree, RequestTreeNode } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

/** Statuses that still hold a parent open — mirrors `OPEN_STATUSES`. */
const OPEN = new Set([
  "draft",
  "submitted",
  "returned",
  "pending_approval",
  "approved",
  "in_progress",
  "on_hold",
  "completed",
]);

/**
 * H2.2 ข้อ 4 — the chain of requests spawned from this one.
 *
 * Drawn as an indented tree rather than a flat list, because the relationship
 * *is* the content: `06_EXAMPLE` traces ten requests across eight departments
 * from one customer order, and a flat list of ten numbers says nothing about
 * which of them came from which.
 *
 * Rows that are still open are bold. They are not decoration — they are exactly
 * what stops this request being closed, so the panel answers "why can I not
 * finish this" without the person having to press the button to find out.
 *
 * The parent appears as a breadcrumb above, and only as a number: a child shows
 * *who it came from*, not that request's contents, which belong to whoever is
 * working on it.
 */
export function RequestTreePanel({
  requestId,
  tree,
}: {
  readonly requestId: string;
  readonly tree: RequestTree;
}) {
  const byParent = new Map<string, RequestTreeNode[]>();
  for (const node of tree.descendants) {
    const parent = node.parentRequestId ?? requestId;
    byParent.set(parent, [...(byParent.get(parent) ?? []), node]);
  }

  function branch(parentId: string, depth = 0) {
    const children = byParent.get(parentId);
    if (!children?.length) return null;

    return (
      <ul className={depth === 0 ? "space-y-1" : "ml-4 space-y-1 border-l pl-3"}>
        {children.map((node) => (
          <li key={node.id}>
            <span className="flex flex-wrap items-baseline gap-2 py-1 text-sm">
              <Link href={ROUTES.requestDetail(node.id)}>
                <Text strong={OPEN.has(node.status)}>
                  {node.requestNo ?? messages.myWork.noNumber}
                </Text>
              </Link>
              <Text type="secondary" className="text-xs">
                {node.typeCode}
              </Text>
              <Tag color={STATUS_COLOR[node.status]} className="m-0!">
                {messages.myWork.status[node.status] ?? node.status}
              </Tag>
              <Text type="secondary" className="text-xs">
                {node.assignee?.displayName ??
                  node.receiver?.displayName ??
                  node.requester?.displayName ??
                  "—"}
              </Text>
            </span>
            {branch(node.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {tree.parent && (
        <Paragraph className="mb-2! text-xs">
          <Link href={ROUTES.requestDetail(tree.parent.id)}>
            {messages.requestDetail.treeOpenedFrom(
              tree.parent.requestNo ?? tree.parent.typeCode,
            )}
          </Link>
        </Paragraph>
      )}

      {tree.descendants.length ? (
        <>
          {branch(requestId)}
          <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
            {messages.requestDetail.treeNote}
          </Paragraph>
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={messages.requestDetail.treeEmpty}
        />
      )}
    </div>
  );
}
