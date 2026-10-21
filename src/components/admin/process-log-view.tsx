"use client";

import { useState } from "react";
import { Button, DatePicker, Input, Select, Space, Table, Tag } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProcessLogRow, ProcessStage } from "@/lib/api/process-logs";
import { messages } from "@/lib/messages";

const { RangePicker } = DatePicker;
const m = messages.processLogs;

const STATUS_COLOR: Record<string, string> = {
  started: "blue",
  completed: "green",
  approved: "green",
  rejected: "red",
  returned: "orange",
  skipped: "default",
  failed: "red",
  info: "default",
};

/**
 * Filters and paging live in the URL, like the audit log: the server page
 * re-queries, and a filtered view is a link someone can send.
 */
export function ProcessLogView({
  rows,
  stages,
  page,
  pageSize,
  total,
}: {
  readonly rows: ProcessLogRow[];
  readonly stages: ProcessStage[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [refNo, setRefNo] = useState(params.get("ref_no") ?? "");
  const [instanceId, setInstanceId] = useState(params.get("instance_id") ?? "");

  function apply(patch: Record<string, string | undefined>, keepPage = false) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!keepPage) next.delete("page");
    router.push(`?${next.toString()}`);
  }

  return (
    <Space orientation="vertical" size="middle" className="flex">
      <Space wrap size="small" className="w-full">
        <Select
          allowClear
          style={{ width: 260 }}
          placeholder={m.filters.anyStage}
          value={params.get("stage_no") ?? undefined}
          options={stages.map((stage) => ({
            value: String(stage.no),
            label: `${stage.no}. ${stage.name}`,
          }))}
          onChange={(value?: string) => apply({ stage_no: value })}
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder={m.filters.anyStatus}
          value={params.get("status") ?? undefined}
          options={Object.keys(STATUS_COLOR).map((status) => ({
            value: status,
            label: m.status[status as keyof typeof m.status] ?? status,
          }))}
          onChange={(value?: string) => apply({ status: value })}
        />
        <Input
          allowClear
          style={{ width: 200 }}
          placeholder={m.filters.refNo}
          value={refNo}
          onChange={(event) => setRefNo(event.target.value)}
          onPressEnter={() => apply({ ref_no: refNo })}
        />
        <Input
          allowClear
          style={{ width: 240 }}
          placeholder={m.filters.instance}
          value={instanceId}
          onChange={(event) => setInstanceId(event.target.value)}
          onPressEnter={() => apply({ instance_id: instanceId })}
        />
        <RangePicker
          showTime
          onChange={(range) =>
            apply({
              from: range?.[0]?.toISOString(),
              to: range?.[1]?.toISOString(),
            })
          }
        />
        <Button
          type="primary"
          onClick={() => apply({ ref_no: refNo, instance_id: instanceId })}
        >
          {m.filters.apply}
        </Button>
        <Button
          onClick={() => {
            setRefNo("");
            setInstanceId("");
            router.push("?");
          }}
        >
          {m.filters.clear}
        </Button>
      </Space>

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
          onChange: (next) => apply({ page: String(next) }, true),
        }}
        scroll={{ x: true }}
        columns={[
          {
            title: m.columns.time,
            dataIndex: "occurred_at",
            render: (value: string) =>
              new Date(value).toLocaleString("th-TH", {
                timeZone: "Asia/Bangkok",
              }),
          },
          {
            title: m.columns.stage,
            key: "stage",
            render: (_: unknown, row: ProcessLogRow) => (
              <span>
                <Tag color="geekblue">{row.stage_no}</Tag>
                {row.stage_name}
                {row.team_code ? (
                  <span className="text-xs text-gray-500">
                    {" "}
                    · {row.team_code}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            title: m.columns.step,
            key: "step",
            render: (_: unknown, row: ProcessLogRow) =>
              row.step_name
                ? `${row.step_name} (${row.step_code})`
                : row.step_code,
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            render: (value: string) => (
              <Tag color={STATUS_COLOR[value] ?? "default"}>
                {m.status[value as keyof typeof m.status] ?? value}
              </Tag>
            ),
          },
          {
            title: m.columns.decision,
            dataIndex: "decision",
            render: (value: string | null) => value ?? "—",
          },
          {
            title: m.columns.ref,
            key: "ref",
            render: (_: unknown, row: ProcessLogRow) =>
              row.ref_no
                ? `${row.ref_type ? `${row.ref_type} · ` : ""}${row.ref_no}`
                : "—",
          },
          {
            title: m.columns.actor,
            key: "actor",
            render: (_: unknown, row: ProcessLogRow) =>
              row.actor_name ?? row.actor_email ?? "—",
          },
          {
            title: m.columns.instance,
            key: "instance",
            render: (_: unknown, row: ProcessLogRow) => (
              <a onClick={() => apply({ instance_id: row.instance_id })}>
                <span className="text-xs">
                  {row.workflow_key} · {row.instance_id.slice(0, 8)}
                </span>
              </a>
            ),
          },
        ]}
        expandable={{
          rowExpandable: (row) => Boolean(row.comment || row.payload),
          expandedRowRender: (row) => (
            <div className="space-y-1 text-xs">
              {row.comment ? <div>{row.comment}</div> : null}
              {row.payload ? (
                <pre className="mb-0 whitespace-pre-wrap">
                  {JSON.stringify(row.payload, null, 2)}
                </pre>
              ) : null}
            </div>
          ),
        }}
      />
    </Space>
  );
}
