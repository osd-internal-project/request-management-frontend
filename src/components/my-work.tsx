"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Checkbox, Empty, Input, Select, Space, Table, Tabs, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

import type {
  RequestRow,
} from "@/lib/api/types";
export type {
  RequestRow,
} from "@/lib/api/types";

/** Shared with the scope-wide list on `/pages/requests`. */
export const STATUS_COLOR: Record<string, string> = {
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
export function humanGap(ms: number): string {
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
export function DueCell({ row, now }: { row: RequestRow; now: number }) {
  const state = row.slaClock?.state;

  if (state === "paused") {
    return <Tag>{messages.myWork.clockPaused}</Tag>;
  }

  /**
   * A stopped clock has already been judged — read its verdict rather than
   * recompute one.
   *
   * `met` means the work finished inside its SLA, and the clock does not run
   * while a request sits returned with its requester (SUP-01). Comparing
   * `dueAt` to the wall clock ignores that pause, so a request the system
   * recorded as on time would keep counting up and eventually read
   * `เกินกำหนด` — contradicting the row the decision was written to.
   */
  if (state === "met") {
    return <Tag color="green">{messages.myWork.onTime}</Tag>;
  }

  if (state === "cancelled") return <Text type="secondary">—</Text>;

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
 * (REQ-08).
 *
 * **The two tabs are filtered in different places, on purpose.**
 *
 * The first tab is whatever the viewer's data scope allows, so its filters are
 * URL parameters the server applies (SCOPE-02): the result set can be larger
 * than one page, and narrowing a page of 100 in the browser would report "not
 * found" for matches sitting on page two.
 *
 * The second tab is the approval inbox — cases where *this* person is the named
 * approver. It is small by construction and its endpoint takes no filters, so
 * it keeps filtering in the browser. Same controls, same behaviour to the user;
 * the difference is only in where the work happens.
 */
export function MyWork({
  mine,
  approvals,
  incoming,
  types,
  scope,
  filters,
  showApprovals = true,
}: {
  mine: RequestRow[];
  approvals: RequestRow[];
  /** Tickets handed to this person that they have not finished. */
  incoming: RequestRow[];
  types: { code: string; name: string }[];
  /** §6.1 level for `request` — decides the tab's name and the ผู้ขอ column. */
  scope: string;
  /** Applied by the server for the first tab; echoed into the controls. */
  filters: {
    status?: string;
    typeCode?: string;
    q?: string;
    overdue: boolean;
  };
  /**
   * Whether the caller holds `approval.decide`. False hides the tab entirely:
   * a permanently empty "รออนุมัติของฉัน · 0" reads as a page that failed to
   * load rather than as work nobody has.
   */
  showApprovals?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(filters.q ?? "");

  // One reading of the clock for the whole page, taken when it mounts.
  const [now] = useState(() => Date.now());

  /** Someone who only ever sees their own rows needs no "whose row is this". */
  const acrossPeople = scope !== "own";

  /** Filters live in the URL so the server can apply them to the scope tab. */
  function apply(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    router.push(next.size ? `${ROUTES.myWork}?${next.toString()}` : ROUTES.myWork);
  }

  /** The same predicates, for the inbox tab — see the note on this component. */
  const filterInbox = useMemo(
    () => (rows: RequestRow[]) =>
      rows.filter((row) => {
        if (filters.status && row.status !== filters.status) return false;
        if (filters.typeCode && row.typeCode !== filters.typeCode) return false;

        if (filters.overdue) {
          const due = row.dueAt ? new Date(row.dueAt).getTime() : null;
          if (due === null || due > now) return false;
        }

        if (!filters.q?.trim()) return true;

        const needle = filters.q.trim().toLowerCase();
        return [row.requestNo, row.refId, row.requestType?.name]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(needle));
      }),
    [filters, now],
  );

  const columns = [
    {
      title: messages.myWork.columns.requestNo,
      dataIndex: "requestNo",
      // REQ-02 issues the number inside the submit transaction, so a draft
      // legitimately has none. A bare dash reads like missing data; saying so
      // makes it obviously the normal state of a draft.
      render: (value: string | null, row: RequestRow) =>
        value ? (
          // A link as well as the row click below: `onRow` cannot be
          // middle-clicked into a new tab, and an anchor can.
          <Link href={ROUTES.requestDetail(row.id)}>
            <Text strong>{value}</Text>
          </Link>
        ) : (
          <Text type="secondary">{messages.myWork.noNumber}</Text>
        ),
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
    // Only where the list crosses people. For scope `own` every row would
    // answer with the reader's own name.
    ...(acrossPeople
      ? [
          {
            title: messages.myWork.columns.requester,
            key: "requester",
            render: (_: unknown, row: RequestRow) => (
              <span className="text-xs">
                {row.requester?.displayName ?? (
                  <Text type="secondary">—</Text>
                )}
              </span>
            ),
          },
        ]
      : []),
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
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: true }}
        onRow={(row) => ({
          className: "cursor-pointer",
          onClick: () => router.push(ROUTES.requestDetail(row.id)),
        })}
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
          onSearch={(value) => apply("q", value.trim() || undefined)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          value={filters.status}
          onChange={(value?: string) => apply("status", value)}
          placeholder={`${messages.myWork.filterStatus}: ${messages.myWork.filterAll}`}
          style={{ width: 170 }}
          options={Object.entries(messages.myWork.status).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          value={filters.typeCode}
          onChange={(value?: string) => apply("type_code", value)}
          placeholder={`${messages.myWork.filterType}: ${messages.myWork.filterAll}`}
          style={{ width: 190 }}
          options={types.map((type) => ({
            value: type.code,
            label: type.name,
          }))}
        />
        <Checkbox
          checked={filters.overdue}
          onChange={(event) =>
            apply("overdue", event.target.checked ? "true" : undefined)
          }
        >
          {messages.myWork.onlyOverdue}
        </Checkbox>
      </Space>

      <Tabs
        items={[
          {
            key: "mine",
            label: `${messages.myWork.tabForScope(scope)} · ${mine.length}`,
            children: table(mine, messages.myWork.empty),
          },
          /*
            The queue that makes the ticket model work. Without it the person a
            request was handed to is the one person who cannot find it: their
            data scope covers what they raised, and this was raised by somebody
            else.
          */
          ...(incoming.length
            ? [
                {
                  key: "incoming",
                  label: `${messages.myWork.tabIncoming} · ${incoming.length}`,
                  children: table(
                    filterInbox(incoming),
                    messages.myWork.emptyIncoming,
                  ),
                },
              ]
            : []),
          ...(showApprovals
            ? [
                {
                  key: "approvals",
                  label: `${messages.myWork.tabApprovals} · ${approvals.length}`,
                  children: table(
                    filterInbox(approvals),
                    messages.myWork.emptyApprovals,
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
