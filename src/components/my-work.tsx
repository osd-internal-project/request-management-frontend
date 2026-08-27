"use client";

import { useMemo, useState } from "react";
import { Card, Checkbox, Empty, Input, Select, Space, Table, Tabs, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";

import type {
  RequestRow,
} from "@/lib/api/types";
export type {
  RequestRow,
} from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  submitted: "blue",
  pending_approval: "gold",
  returned: "orange",
  approved: "green",
  rejected: "red",
  in_progress: "cyan",
  completed: "green",
  cancelled: "default",
};

/** "3 ชม." / "2 วัน" — the granularity the mockup shows. */
function humanGap(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(Math.floor(ms / 60_000), 1)} นาที`;
  if (hours < 24) return `${hours} ชม.`;
  return `${Math.floor(hours / 24)} วัน`;
}

/**
 * The `ครบกำหนด` cell (§16 หน้าที่ 2).
 *
 * Three states, because that is what the clock actually has: stopped while the
 * request sits with its requester, past due, or counting down. Showing a
 * deadline for a paused clock would be a lie — the time is not running.
 *
 * `now` is passed in rather than read here: reading the clock during render
 * makes the same row render differently on an incidental re-render, so the
 * page takes one reading and every row is measured against it.
 */
function DueCell({ row, now }: { row: RequestRow; now: number }) {
  if (row.slaClock?.state === "paused") {
    return <Tag>{messages.myWork.clockPaused}</Tag>;
  }

  if (!row.dueAt) return <Text type="secondary">—</Text>;

  const gap = new Date(row.dueAt).getTime() - now;

  return gap < 0 ? (
    <Tag color="red">{messages.myWork.overdueBy(humanGap(-gap))}</Tag>
  ) : (
    <Tag color="green">{messages.myWork.dueIn(humanGap(gap))}</Tag>
  );
}

/**
 * Screen §16 หน้าที่ 2 — งานค้างของฉัน, the landing page after login.
 *
 * Two tabs across every request type, filtered by data scope at the backend
 * (REQ-08). Filtering happens here rather than by refetching: the page size is
 * bounded and a round trip per keystroke would make the search box feel broken.
 */
export function MyWork({
  mine,
  approvals,
  types,
  showApprovals = true,
}: {
  mine: RequestRow[];
  approvals: RequestRow[];
  types: { code: string; name: string }[];
  /**
   * Whether the caller holds `approval.decide`. False hides the tab entirely:
   * a permanently empty "รออนุมัติของฉัน · 0" reads as a page that failed to
   * load rather than as work nobody has.
   */
  showApprovals?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [typeCode, setTypeCode] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);

  // One reading of the clock for the whole page, taken when it mounts.
  const [now] = useState(() => Date.now());

  const filter = useMemo(
    () => (rows: RequestRow[]) =>
      rows.filter((row) => {
        if (status && row.status !== status) return false;
        if (typeCode && row.typeCode !== typeCode) return false;

        if (overdueOnly) {
          const due = row.dueAt ? new Date(row.dueAt).getTime() : null;
          if (due === null || due > now) return false;
        }

        if (!search.trim()) return true;

        const needle = search.trim().toLowerCase();
        return [row.requestNo, row.refId, row.requestType?.name]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(needle));
      }),
    [search, status, typeCode, overdueOnly, now],
  );

  const columns = [
    {
      title: messages.myWork.columns.requestNo,
      dataIndex: "requestNo",
      render: (value: string | null) =>
        value ? <Text strong>{value}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: messages.myWork.columns.typeRef,
      key: "typeRef",
      render: (_: unknown, row: RequestRow) => (
        <div className="text-xs">
          <div>{row.requestType?.name ?? row.typeCode}</div>
          {row.refId && (
            <Text type="secondary">
              {row.refType ?? "ref"} {row.refId}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: messages.myWork.columns.status,
      dataIndex: "status",
      render: (value: string) => (
        <Tag color={STATUS_COLOR[value]}>
          {messages.myWork.status[value] ?? value}
        </Tag>
      ),
    },
    {
      title: messages.myWork.columns.currentStep,
      key: "step",
      render: (_: unknown, row: RequestRow) => {
        const approvalCase = row.approvalCases?.[0];
        if (!approvalCase) return <Text type="secondary">—</Text>;

        const step = approvalCase.steps.find(
          (candidate) => candidate.stepNo === approvalCase.currentStep,
        );

        return (
          <span className="text-xs">
            {messages.myWork.step(
              approvalCase.currentStep,
              approvalCase.steps.length,
            )}
            {step ? ` · ${step.approverRole}` : ""}
          </span>
        );
      },
    },
    {
      title: messages.myWork.columns.dueAt,
      key: "due",
      render: (_: unknown, row: RequestRow) => <DueCell row={row} now={now} />,
    },
  ];

  const table = (rows: RequestRow[], emptyText: string) =>
    rows.length ? (
      <Table
        rowKey="id"
        size="small"
        dataSource={filter(rows)}
        columns={columns}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: true }}
      />
    ) : (
      <Empty description={emptyText} />
    );

  return (
    <Card>
      <Space wrap className="mb-3 flex">
        <Input.Search
          allowClear
          placeholder={messages.myWork.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          value={status}
          onChange={setStatus}
          placeholder={`${messages.myWork.filterStatus}: ${messages.myWork.filterAll}`}
          style={{ width: 170 }}
          options={Object.entries(messages.myWork.status).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <Select
          allowClear
          value={typeCode}
          onChange={setTypeCode}
          placeholder={`${messages.myWork.filterType}: ${messages.myWork.filterAll}`}
          style={{ width: 190 }}
          options={types.map((type) => ({
            value: type.code,
            label: type.name,
          }))}
        />
        <Checkbox
          checked={overdueOnly}
          onChange={(event) => setOverdueOnly(event.target.checked)}
        >
          {messages.myWork.onlyOverdue}
        </Checkbox>
      </Space>

      <Tabs
        items={[
          {
            key: "mine",
            label: `${messages.myWork.tabMine} · ${mine.length}`,
            children: table(mine, messages.myWork.empty),
          },
          ...(showApprovals
            ? [
                {
                  key: "approvals",
                  label: `${messages.myWork.tabApprovals} · ${approvals.length}`,
                  children: table(approvals, messages.myWork.emptyApprovals),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
