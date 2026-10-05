"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  DatePicker,
  Progress,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { thaiDate } from "./delivery-types";

const m = messages.delivery.report;

interface Rate {
  counted: number;
  onTime: number;
  late: number;
  noDueDay: number;
  pct: number | null;
}

interface Phase {
  projectId: string;
  project: string;
  customer: string | null;
  manager: string | null;
  milestoneId: string;
  phase: string;
  dueOn: string | null;
  deliveries: number;
  delivered: number;
  rounds: number;
  status: string;
  acceptedOn: string | null;
  result: string | null;
  firstRoundPassed: boolean | null;
  onTime: boolean | null;
  daysLate: number | null;
  openItems: number;
  certificateSigned: boolean;
}

interface PhasesView {
  from: string;
  to: string;
  refreshedAt: string | null;
  summary: Rate & {
    accepted: number;
    firstRoundPct: number | null;
    byStatus: Record<string, number>;
  };
  monthly: (Rate & { month: string })[];
  accepted: Phase[];
  pending: Phase[];
  openPoints: Phase[];
}

interface Receivable {
  contractId: string;
  contractNo: string;
  installment: string;
  projectId: string | null;
  project: string | null;
  customer: string | null;
  owner: string | null;
  amount: number;
  invoiceNo: string | null;
  invoicedOn: string;
  dueOn: string;
  daysOverdue: number | null;
}

interface ReceivablesView {
  scope: "all" | "own";
  creditDays: number;
  refreshedAt: string | null;
  summary: {
    overdue: { count: number; amount: number };
    open: { count: number; amount: number };
    aging: Record<string, { count: number; amount: number }>;
  };
  overdue: Receivable[];
  open: Receivable[];
}

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const money = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const day = (value: string | null) => (value ? thaiDate(value) : "—");
const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

function Refreshed({ at }: { at: string | null }) {
  return (
    <Text type="secondary" className="text-xs">
      {at
        ? fill(m.refreshedAt, {
            d: new Date(at).toLocaleString("th-TH", {
              day: "numeric",
              month: "short",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })
        : m.notRefreshed}
    </Text>
  );
}

const projectCell = (row: {
  projectId: string | null;
  project: string | null;
}) =>
  row.projectId && row.project ? (
    <Link href={`${ROUTES.projects}/${row.projectId}`}>{row.project}</Link>
  ) : (
    (row.project ?? "—")
  );

function useLoad<T>(path: string | null) {
  const [loaded, setLoaded] = useState<{
    path: string;
    data: T | null;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    void appApi<T>(path).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { path, data: result.data, error: null }
          : { path, data: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [path]);
  return loaded?.path === path ? loaded : null;
}

/** CD-256 — the delivery report: phases, on-time acceptance, money owed. */
export function DeliveryReport({
  canPhases,
  initialTab,
}: {
  canPhases: boolean;
  initialTab?: string;
}) {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(11, "month").startOf("month"),
    dayjs().startOf("month"),
  ]);
  const phases = useLoad<PhasesView>(
    canPhases
      ? `delivery/report/phases?from=${range[0].format("YYYY-MM")}&to=${range[1].format("YYYY-MM")}`
      : null,
  );
  const receivables = useLoad<ReceivablesView>("delivery/report/receivables");
  const view = phases?.data ?? null;
  const money$ = receivables?.data ?? null;

  const phaseColumns = (extra: "accepted" | "pending" | "open") => [
    {
      title: m.project,
      key: "project",
      render: (_: unknown, r: Phase) => projectCell(r),
    },
    {
      title: m.customer,
      dataIndex: "customer",
      render: (v: string | null) => v ?? "—",
    },
    { title: m.phase, dataIndex: "phase" },
    { title: m.dueOn, dataIndex: "dueOn", width: 110, render: day },
    ...(extra === "pending"
      ? [
          {
            title: m.status,
            dataIndex: "status",
            width: 170,
            render: (v: string) => <Tag>{m.statuses[v] ?? v}</Tag>,
          },
          {
            title: m.delivered,
            key: "delivered",
            width: 90,
            render: (_: unknown, r: Phase) => `${r.delivered}/${r.deliveries}`,
          },
          { title: m.rounds, dataIndex: "rounds", width: 90 },
          {
            title: m.daysLate,
            dataIndex: "daysLate",
            width: 90,
            render: (v: number | null) =>
              v ? <Text type="danger">{v}</Text> : "—",
          },
        ]
      : [
          {
            title: m.acceptedOn,
            dataIndex: "acceptedOn",
            width: 110,
            render: day,
          },
          {
            title: m.result,
            key: "result",
            width: 200,
            render: (_: unknown, r: Phase) => (
              <Space size={4} wrap>
                <Tag color={r.result === "accepted" ? "success" : "warning"}>
                  {m.results[r.result ?? ""] ?? r.result}
                </Tag>
                {r.onTime === null ? null : r.onTime ? (
                  <Tag color="success">{m.onTimeTag}</Tag>
                ) : (
                  <Tag color="error">
                    {fill(m.lateTag, { n: r.daysLate ?? 0 })}
                  </Tag>
                )}
                {r.firstRoundPassed ? <Tag>{m.firstRound}</Tag> : null}
              </Space>
            ),
          },
          ...(extra === "open"
            ? [{ title: m.openItems, dataIndex: "openItems", width: 100 }]
            : []),
          {
            title: m.certificate,
            dataIndex: "certificateSigned",
            width: 110,
            render: (v: boolean) =>
              v ? (
                <Tag color="success">{m.signed}</Tag>
              ) : (
                <Tag>{m.unsigned}</Tag>
              ),
          },
        ]),
    {
      title: m.manager,
      dataIndex: "manager",
      width: 140,
      render: (v: string | null) => v ?? "—",
    },
  ];

  const receivableColumns = (overdue: boolean) => [
    { title: m.contract, dataIndex: "contractNo", width: 140 },
    {
      title: m.customer,
      dataIndex: "customer",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: m.project,
      key: "project",
      render: (_: unknown, r: Receivable) => projectCell(r),
    },
    { title: m.installment, dataIndex: "installment" },
    {
      title: m.amount,
      dataIndex: "amount",
      width: 140,
      align: "right" as const,
      render: money,
    },
    {
      title: m.invoice,
      dataIndex: "invoiceNo",
      width: 120,
      render: (v: string | null) => v ?? "—",
    },
    { title: m.invoicedOn, dataIndex: "invoicedOn", width: 100, render: day },
    { title: m.payDue, dataIndex: "dueOn", width: 110, render: day },
    ...(overdue
      ? [
          {
            title: m.daysOverdue,
            dataIndex: "daysOverdue",
            width: 90,
            render: (v: number | null) => <Text type="danger">{v ?? "—"}</Text>,
          },
        ]
      : []),
    ...(money$?.scope === "all"
      ? [
          {
            title: m.owner,
            dataIndex: "owner",
            width: 140,
            render: (v: string | null) => v ?? "—",
          },
        ]
      : []),
  ];

  const receivablesTab = !receivables ? (
    <Skeleton active />
  ) : receivables.error ? (
    <Alert type="error" showIcon title={receivables.error} />
  ) : money$ ? (
    <Space orientation="vertical" className="w-full" size="middle">
      <Space wrap split="·">
        <Text>{money$.scope === "all" ? m.scopeAll : m.scopeOwn}</Text>
        <Text type="secondary">
          {fill(m.creditHint, { n: money$.creditDays })}
        </Text>
        <Refreshed at={money$.refreshedAt} />
      </Space>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Card size="small" className="xl:col-span-1">
          <Statistic
            title={m.overdue}
            value={money$.summary.overdue.amount}
            precision={2}
            styles={{ content: { color: "var(--ant-color-error)" } }}
          />
          <Text type="secondary">
            {fill(m.count, { n: money$.summary.overdue.count })}
          </Text>
        </Card>
        <Card size="small" className="xl:col-span-1">
          <Statistic
            title={m.notDue}
            value={money$.summary.open.amount}
            precision={2}
          />
          <Text type="secondary">
            {fill(m.count, { n: money$.summary.open.count })}
          </Text>
        </Card>
        {Object.entries(money$.summary.aging).map(([key, bucket]) => (
          <Card size="small" key={key}>
            <Statistic
              title={`${m.aging} ${m.agingKeys[key] ?? key}`}
              value={bucket.amount}
              precision={2}
            />
            <Text type="secondary">{fill(m.count, { n: bucket.count })}</Text>
          </Card>
        ))}
      </div>
      <Card size="small" title={m.overdue}>
        <Table<Receivable>
          rowKey={(r) => `${r.contractId}-${r.installment}`}
          size="small"
          dataSource={money$.overdue}
          columns={receivableColumns(true)}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: m.none }}
          scroll={{ x: 1100 }}
        />
      </Card>
      <Card size="small" title={m.notDue}>
        <Table<Receivable>
          rowKey={(r) => `${r.contractId}-${r.installment}`}
          size="small"
          dataSource={money$.open}
          columns={receivableColumns(false)}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: m.none }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Space>
  ) : null;

  const phaseLoading = !phases ? (
    <Skeleton active />
  ) : phases.error ? (
    <Alert type="error" showIcon title={phases.error} />
  ) : null;

  const tabs = [
    ...(canPhases
      ? [
          {
            key: "on-time",
            label: m.tabs.onTime,
            children:
              phaseLoading ??
              (view && (
                <Space orientation="vertical" className="w-full" size="middle">
                  <Space wrap>
                    <Text>{m.months}</Text>
                    <DatePicker.RangePicker
                      picker="month"
                      allowClear={false}
                      value={range}
                      onChange={(value) =>
                        value?.[0] && value[1] && setRange([value[0], value[1]])
                      }
                    />
                    <Refreshed at={view.refreshedAt} />
                  </Space>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Card size="small">
                      <Statistic
                        title={m.accepted}
                        value={view.summary.accepted}
                      />
                    </Card>
                    <Card size="small">
                      <Statistic
                        title={m.onTimePct}
                        value={pct(view.summary.pct)}
                      />
                      <Text type="secondary" className="text-xs">
                        {view.summary.onTime} / {view.summary.counted}
                        {view.summary.noDueDay
                          ? ` · ${fill(m.noDueDay, { n: view.summary.noDueDay })}`
                          : ""}
                      </Text>
                    </Card>
                    <Card size="small">
                      <Statistic
                        title={m.firstRoundPct}
                        value={pct(view.summary.firstRoundPct)}
                      />
                    </Card>
                  </div>
                  <Text type="secondary" className="text-xs">
                    {m.onTimeHint}
                  </Text>
                  <Table
                    rowKey="month"
                    size="small"
                    pagination={false}
                    dataSource={view.monthly}
                    columns={[
                      {
                        title: m.month,
                        dataIndex: "month",
                        width: 110,
                        render: (v: string) =>
                          dayjs(`${v}-01`)
                            .toDate()
                            .toLocaleDateString("th-TH", {
                              month: "short",
                              year: "2-digit",
                            }),
                      },
                      { title: m.onTime, dataIndex: "onTime", width: 100 },
                      { title: m.late, dataIndex: "late", width: 100 },
                      {
                        title: m.onTimePct,
                        dataIndex: "pct",
                        render: (v: number | null) =>
                          v === null ? (
                            "—"
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-14 text-right tabular-nums">
                                {v}%
                              </span>
                              <Progress
                                percent={v}
                                showInfo={false}
                                size="small"
                                className="!m-0 min-w-24 flex-1"
                              />
                            </div>
                          ),
                      },
                    ]}
                  />
                  <Card size="small" title={m.acceptedList}>
                    <Table<Phase>
                      rowKey="milestoneId"
                      size="small"
                      dataSource={view.accepted}
                      columns={phaseColumns("accepted")}
                      pagination={{ pageSize: 20, hideOnSinglePage: true }}
                      locale={{ emptyText: m.none }}
                      scroll={{ x: 1100 }}
                    />
                  </Card>
                </Space>
              )),
          },
          {
            key: "pending",
            label: m.tabs.pending,
            children:
              phaseLoading ??
              (view && (
                <Space orientation="vertical" className="w-full" size="middle">
                  <Space wrap>
                    {Object.entries(view.summary.byStatus).map(([key, n]) => (
                      <Tag key={key}>
                        {m.statuses[key] ?? key}: {n}
                      </Tag>
                    ))}
                    <Refreshed at={view.refreshedAt} />
                  </Space>
                  <Card size="small" title={m.pendingTitle}>
                    <Table<Phase>
                      rowKey="milestoneId"
                      size="small"
                      dataSource={view.pending}
                      columns={phaseColumns("pending")}
                      pagination={{ pageSize: 20, hideOnSinglePage: true }}
                      locale={{ emptyText: m.none }}
                      scroll={{ x: 1100 }}
                    />
                  </Card>
                  <Card size="small" title={m.openPointsTitle}>
                    <Table<Phase>
                      rowKey="milestoneId"
                      size="small"
                      dataSource={view.openPoints}
                      columns={phaseColumns("open")}
                      pagination={{ pageSize: 20, hideOnSinglePage: true }}
                      locale={{ emptyText: m.none }}
                      scroll={{ x: 1100 }}
                    />
                  </Card>
                </Space>
              )),
          },
        ]
      : []),
    { key: "receivables", label: m.tabs.receivables, children: receivablesTab },
  ];

  return (
    <Tabs
      defaultActiveKey={
        tabs.some((t) => t.key === initialTab) ? initialTab : tabs[0].key
      }
      items={tabs}
    />
  );
}
