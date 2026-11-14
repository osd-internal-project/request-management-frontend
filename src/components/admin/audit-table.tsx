"use client";

import { Table, Tag } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
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
 *
 * Paging writes `?page=` and lets the server component re-query, matching the
 * filters. Without it the pager rendered the right numbers and did nothing when
 * clicked, which reads as a frozen screen rather than a missing handler.
 */
export function AuditTable({
  rows,
  page,
  pageSize,
  total,
  companyNames,
}: {
  rows: AuditLogRow[];
  page: number;
  pageSize: number;
  total: number;
  /** P8 `/system/audit`: shows which company each row belongs to. */
  companyNames?: Record<string, string>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function goTo(next: number) {
    const query = new URLSearchParams(params.toString());
    query.set("page", String(next));
    router.push(`?${query.toString()}`);
  }

  return (
    <Table
      rowKey="id"
      size="small"
      dataSource={rows}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        onChange: goTo,
      }}
      scroll={{ x: true }}
      columns={[
        ...(companyNames
          ? [
              {
                title: messages.audit.columns.company,
                key: "company",
                render: (_: unknown, row: AuditLogRow) =>
                  row.companyId
                    ? (companyNames[row.companyId] ?? row.companyId)
                    : messages.audit.systemLevel,
              },
            ]
          : []),
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
