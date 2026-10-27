"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, Tag } from "antd";
import { SearchSelect } from "@/components/ui/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { AgentRecordRow } from "@/lib/api/agent-records";
import { formatDateTime } from "./format";
import { useAgentRecordStream } from "./use-agent-record-stream";

const m = messages.agentRecords;

/**
 * งานของ agent ทีละหน้า — เฝ้าเฉพาะแถว `processing` ในหน้าที่เปิดอยู่ แล้วให้
 * server page อ่านใหม่ทั้งหน้าเมื่อแถวใดเปลี่ยน (ตัวเลข total ตรงกับแถวเสมอ).
 */
export function AgentRecordList({
  rows,
  total,
  page,
  pageSize,
  status,
}: {
  rows: AgentRecordRow[];
  total: number;
  page: number;
  pageSize: number;
  status?: string;
}) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  useAgentRecordStream(
    rows.filter((row) => row.status === "processing").map((row) => row.id),
    refresh,
  );

  function navigate(next: { status?: string; page?: number }) {
    const params = new URLSearchParams();
    const nextStatus = "status" in next ? next.status : status;
    if (nextStatus) params.set("status", nextStatus);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.agentRecords}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <SearchSelect
        className="min-w-40"
        allowClear
        placeholder={m.filterStatus}
        value={status}
        onChange={(value) =>
          navigate({ status: (value as string) || undefined, page: 1 })
        }
        options={Object.entries(m.status).map(([value, label]) => ({
          value,
          label,
        }))}
      />

      <Table
        rowKey="id"
        size="small"
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (count) => m.resultCount(count),
          onChange: (next) => navigate({ page: next }),
        }}
        scroll={{ x: true }}
        columns={[
          {
            title: m.columns.action,
            dataIndex: "action",
            render: (action: string) => m.action[action] ?? action,
          },
          {
            title: m.columns.topic,
            key: "topic",
            render: (_: unknown, row: AgentRecordRow) => (
              <Link href={ROUTES.agentRecordDetail(row.id)}>
                {row.input.topic ?? row.id}
              </Link>
            ),
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            render: (value: AgentRecordRow["status"]) => (
              <Tag color={m.statusColor[value]}>{m.status[value]}</Tag>
            ),
          },
          {
            title: m.columns.createdBy,
            dataIndex: "createdByName",
            render: (name: string | null) => name ?? "-",
          },
          {
            title: m.columns.createdAt,
            dataIndex: "createdAt",
            render: formatDateTime,
          },
          {
            title: m.columns.updatedAt,
            dataIndex: "updatedAt",
            render: formatDateTime,
          },
        ]}
      />
    </div>
  );
}
