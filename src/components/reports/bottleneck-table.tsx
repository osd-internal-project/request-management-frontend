"use client";

import { Table } from "antd";
import Text from "antd/es/typography/Text";
import type { BottleneckRow } from "@/lib/api/reports";
import { messages } from "@/lib/messages";

/**
 * REQ-09's table.
 *
 * A client component because antd column definitions carry `render`
 * functions, and a function cannot cross the server/client boundary — passing
 * these from the page itself fails at serialisation, not at render, so the
 * screen 500s with the data already fetched.
 */
export function BottleneckTable({ rows }: { rows: BottleneckRow[] }) {
  const columns = [
    { title: messages.bottleneck.columns.type, dataIndex: "type_code" },
    { title: messages.bottleneck.columns.step, dataIndex: "step_no" },
    { title: messages.bottleneck.columns.role, dataIndex: "approver_role" },
    { title: messages.bottleneck.columns.decided, dataIndex: "decided_count" },
    {
      title: messages.bottleneck.columns.pending,
      dataIndex: "pending_count",
      // Drawn out because a large pending count *is* the bottleneck.
      render: (value: number) =>
        value ? <Text type="warning">{value}</Text> : value,
    },
    {
      title: messages.bottleneck.columns.mean,
      dataIndex: "mean_hours",
      render: (value: number | null) => value ?? "—",
    },
    {
      title: messages.bottleneck.columns.max,
      dataIndex: "max_hours",
      render: (value: number | null) => value ?? "—",
    },
  ];

  return (
    <Table<BottleneckRow>
      rowKey={(row) =>
        `${row.type_code}-${row.step_no}-${row.approver_role}-${row.approver_user_id ?? ""}`
      }
      size="small"
      dataSource={rows}
      columns={columns}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      scroll={{ x: true }}
    />
  );
}
