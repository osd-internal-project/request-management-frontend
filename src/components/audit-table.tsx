"use client";

import { Table, Tag } from "antd";
import { messages } from "@/lib/messages";

import type {
  AuditLogRow,
} from "@/lib/api/types";
export type {
  AuditLogRow,
} from "@/lib/api/types";

/**
 * The audit table, as a **client** component.
 *
 * antd's `Table` takes `render` callbacks in its `columns`, and React Server
 * Components cannot hand functions to a client component — doing so fails at
 * render with "Functions cannot be passed directly to Client Components".
 * Keeping the column definitions on this side of the boundary is the fix; the
 * server page passes plain data only.
 */
export function AuditTable({
  rows,
  page,
  pageSize,
  total,
}: {
  rows: AuditLogRow[];
  page: number;
  pageSize: number;
  total: number;
}) {
  return (
    <Table
      rowKey="id"
      size="small"
      dataSource={rows}
      pagination={{ current: page, pageSize, total }}
      scroll={{ x: true }}
      columns={[
        {
          title: messages.audit.columns.time,
          dataIndex: "createdAt",
          render: (value: string) => new Date(value).toLocaleString("th-TH"),
        },
        {
          title: messages.audit.columns.actor,
          dataIndex: "actorUsername",
          render: (value: string | null) => value ?? "—",
        },
        {
          title: messages.audit.columns.event,
          dataIndex: "eventType",
          render: (value: string) => <Tag>{value}</Tag>,
        },
        {
          title: messages.audit.columns.resource,
          key: "resource",
          render: (_: unknown, row: AuditLogRow) =>
            row.resourceType
              ? `${row.resourceType}${row.resourceId ? ` · ${row.resourceId}` : ""}`
              : "—",
        },
      ]}
    />
  );
}
