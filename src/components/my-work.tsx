"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Card,
  Checkbox,
  Empty,
  Input,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/search-select";
import { ROUTES } from "@/lib/routes";
import { RequestRowActions } from "@/components/request-row-actions";
import type { Session } from "@/lib/session-shape";

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
/**
 * The columns §16 หน้าที่ 2 draws, shared by "งานค้างของฉัน" and "งานทั้งหมด".
 *
 * Lifted out of the component so both screens print the same table. Two copies
 * would drift on the first column anyone added — and a head comparing their own
 * queue against their team's would be comparing two different tables.
 *
 * `now` is passed in rather than read here: reading the clock during render
 * makes the same row render differently on an incidental re-render.
 *
 * `session` gates the action column: a move is offered only when the row says
 * this person has the authority (`available_actions`, decided by the backend)
 * *and* the session says their role holds the permission. Pass null to render
 * the table without any buttons.
 */
export function requestColumns(now: number, session: Session | null = null) {
  return [
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
    /*
      Always shown. The list used to hide this column at scope `own`, where
      every row answered with the reader's own name; visibility now includes
      tickets handed to you and work in the groups you lead, so "whose row is
      this" is a real question on every tab.
    */
    {
      title: messages.myWork.columns.requester,
      key: "requester",
      render: (_: unknown, row: RequestRow) => (
        <span className="text-xs">
          {row.requester?.displayName ?? <Text type="secondary">—</Text>}
        </span>
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
    {
      title: messages.myWork.columns.actions,
      key: "actions",
      render: (_: unknown, row: RequestRow) => (
        <RequestRowActions row={row} session={session} />
      ),
    },
    ];
}

/**
 * One tab's worth of work: the rows this page fetched, and how many exist.
 *
 * The two are not the same number. The page asks for 100 rows, and the tab
 * label used to print how many came back — so a queue of 140 read `100`, and
 * every tab silently agreed with itself while disagreeing with the database.
 */
export interface WorkTab {
  readonly rows: RequestRow[];
  /** The server's count for the whole filter, not the page. */
  readonly total: number;
}

export function MyWork({
  involved,
  created,
  incoming,
  approver,
  awaiting,
  types,
  filters,
  session,
}: {
  /** ทั้งหมด — everything this person raised, received, carries, or may approve. */
  involved: WorkTab;
  /** สร้าง — raised by them. */
  created: WorkTab;
  /** รับเรื่อง — handed to them and not finished. */
  incoming: WorkTab;
  /**
   * อนุมัติ — every request naming this person anywhere in its approval route.
   *
   * Null for somebody without `approval.decide`: the page does not run the
   * query for them, and the tab is not rendered. It used to count only cases
   * *pending* their decision, which made a full approval history read `· 0`.
   */
  approver: WorkTab | null;
  /**
   * How many of those are actually waiting on this person right now.
   *
   * Printed as a badge beside the tab count, which is deliberately broader.
   * Without it the tab answers "have I ever been an approver" where the reader
   * is asking "do I owe a decision".
   */
  awaiting: number;
  types: { code: string; name: string }[];
  /** Gates the action buttons in each row — see `requestColumns`. */
  session: Session | null;
  /** Applied by the server for the first tab; echoed into the controls. */
  filters: {
    status?: string;
    typeCode?: string;
    q?: string;
    overdue: boolean;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(filters.q ?? "");

  // One reading of the clock for the whole page, taken when it mounts.
  const [now] = useState(() => Date.now());


  /** Filters live in the URL so the server can apply them to the scope tab. */
  function apply(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    router.push(next.size ? `${ROUTES.myWork}?${next.toString()}` : ROUTES.myWork);
  }

  const columns = requestColumns(now, session);

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
        <SearchSelect
          allowClear
          value={filters.status}
          onChange={(value?: string) => apply("status", value)}
          placeholder={`${messages.myWork.filterStatus}: ${messages.myWork.filterAll}`}
          style={{ width: 170 }}
          options={Object.entries(messages.myWork.status).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <SearchSelect
          allowClear
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

      {/*
        The first three are always rendered, in the order the requirement names
        them. Hiding an empty one used to save a line and cost more: a tab that
        appears only when it has work makes the row jump about, and "รับเรื่อง"
        vanishing is indistinguishable from a page that failed to load it.

        "อนุมัติ" is the one exception, and for the opposite reason: somebody
        without `approval.decide` can never be named on a step, so the tab is
        not empty-for-now, it is empty-forever. The page skips its query too.
      */}
      <Tabs
        items={[
          {
            key: "involved",
            label: `${messages.myWork.tabInvolved} · ${involved.total}`,
            children: table(involved.rows, messages.myWork.empty),
          },
          {
            key: "created",
            label: `${messages.myWork.tabCreated} · ${created.total}`,
            children: table(created.rows, messages.myWork.empty),
          },
          /*
            The queue that makes the ticket model work. Without it the person a
            request was handed to is the one person who cannot find it: what
            they can see covers what they raised, and this was raised by
            somebody else.
          */
          {
            key: "incoming",
            label: `${messages.myWork.tabIncoming} · ${incoming.total}`,
            children: table(incoming.rows, messages.myWork.emptyIncoming),
          },
          ...(approver
            ? [
                {
                  key: "approver",
                  label: (
                    <span>
                      {messages.myWork.tabApprovals} · {approver.total}
                      {awaiting > 0 && (
                        <Badge
                          count={awaiting}
                          className="ml-2"
                          title={messages.myWork.awaitingMe}
                        />
                      )}
                    </span>
                  ),
                  children: table(
                    approver.rows,
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
