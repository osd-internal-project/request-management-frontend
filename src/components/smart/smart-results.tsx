"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  DatePicker,
  Empty,
  Select,
  Spin,
  Statistic,
  Table,
  Tabs,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.aiSmart.results;
const axes = messages.aiSmart.axes;

const AXES = ["getter", "government", "partner", "keeper"] as const;

/** The funnel, in the order a prospect moves through it. */
const STAGES = [
  "swept",
  "screened",
  "called",
  "reached",
  "interested",
  "handed_off",
  "deal",
  "won",
] as const;

interface Funnel {
  key: string | null;
  label: string | null;
  swept: number;
  screened: number;
  called: number;
  reached: number;
  refused: number;
  interested: number;
  handed_off: number;
  deal: number;
  won: number;
  reach_rate: number | null;
  refusal_rate: number | null;
  interest_rate: number | null;
  deal_rate: number | null;
  win_rate: number | null;
}

interface CallMonth {
  month: string;
  calls: number;
  reached: number;
  refused: number;
  interested: number;
  reach_rate: number | null;
  refusal_rate: number | null;
}

interface Overview {
  refreshed_at: string | null;
  total: Funnel;
  by_source: Funnel[];
  by_axis: Funnel[];
  by_list: Funnel[];
  by_month: Funnel[];
  calls: CallMonth[];
}

const pct = (value: number | null) =>
  value === null ? "—" : `${Math.round(value * 1000) / 10}%`;
const count = (value: number) => value.toLocaleString("th-TH");

/** Each stage as a bar against the number swept. */
function FunnelBars({ row }: { row: Funnel }) {
  const top = Math.max(1, row.swept);
  return (
    <div className="space-y-1.5">
      {STAGES.map((stage) => (
        <div key={stage} className="flex items-center gap-2 text-sm">
          <div className="w-36 shrink-0">{m.stages[stage]}</div>
          <div className="flex-1">
            <div
              className="h-4 rounded bg-blue-500"
              style={{ width: `${(row[stage] / top) * 100}%`, minWidth: 2 }}
            />
          </div>
          <div className="w-16 shrink-0 text-right">{count(row[stage])}</div>
        </div>
      ))}
    </div>
  );
}

/** One funnel per row of a split (source, axis, call list, month). */
function SplitTable({
  rows,
  name,
  label,
}: {
  rows: Funnel[];
  name: string;
  label: (row: Funnel) => string;
}) {
  return (
    <Table<Funnel>
      rowKey={(row) => row.key ?? "none"}
      size="small"
      pagination={false}
      dataSource={rows}
      scroll={{ x: true }}
      locale={{ emptyText: m.empty }}
      columns={[
        {
          title: name,
          key: "label",
          fixed: "left",
          render: (_, row) => label(row),
        },
        ...STAGES.map((stage) => ({
          title: m.stages[stage],
          dataIndex: stage,
          align: "right" as const,
          render: count,
        })),
        {
          title: m.rates.reach,
          dataIndex: "reach_rate",
          align: "right" as const,
          render: pct,
        },
        {
          title: m.rates.refusal,
          dataIndex: "refusal_rate",
          align: "right" as const,
          render: pct,
        },
        {
          title: m.rates.deal,
          dataIndex: "deal_rate",
          align: "right" as const,
          render: pct,
        },
      ]}
    />
  );
}

/**
 * CD-295 — AI SMART from sweep to closed sale, from the Data Mart: each
 * prospect counted at the furthest stage it reached, split by source, sales
 * axis, call list (its script) and sweep month, and the calls month by month.
 */
export function SmartResults({
  sources,
}: {
  sources?: { id: string; name: string }[];
}) {
  const [source, setSource] = useState<string | undefined>();
  const [axis, setAxis] = useState<string | undefined>();
  const [from, setFrom] = useState<Dayjs | null>(
    dayjs().subtract(5, "month").startOf("month"),
  );
  const [to, setTo] = useState<Dayjs | null>(dayjs().startOf("month"));
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams();
    if (source) params.set("source_id", source);
    if (axis) params.set("sales_axis", axis);
    if (from) params.set("from", from.format("YYYY-MM"));
    if (to) params.set("to", to.format("YYYY-MM"));
    void appApi<Overview>(`smart/results?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        if (result.ok) {
          setError(null);
          setData(result.data);
        } else setError(result.message);
      },
    );
    return () => {
      live = false;
    };
  }, [source, axis, from, to]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {sources && (
          <Select
            allowClear
            className="w-52"
            placeholder={m.allSources}
            value={source}
            onChange={setSource}
            options={sources.map((row) => ({ value: row.id, label: row.name }))}
          />
        )}
        <Select
          allowClear
          className="w-52"
          placeholder={m.allAxes}
          value={axis}
          onChange={setAxis}
          options={AXES.map((value) => ({ value, label: axes[value] }))}
        />
        <DatePicker
          picker="month"
          placeholder={m.monthsFrom}
          value={from}
          format="MM/YYYY"
          onChange={setFrom}
        />
        <DatePicker
          picker="month"
          placeholder={m.monthsTo}
          value={to}
          format="MM/YYYY"
          onChange={setTo}
        />
      </div>

      {error && <Alert type="error" showIcon title={error} />}

      {!data ? (
        !error && (
          <div className="py-10 text-center">
            <Spin />
          </div>
        )
      ) : (
        <>
          <Text type="secondary" className="block text-xs">
            {data.refreshed_at
              ? m.refreshedAt(
                  dayjs(data.refreshed_at).format("DD/MM/YYYY HH:mm"),
                )
              : m.notBuilt}{" "}
            · {m.countedOnce}
          </Text>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["swept", count(data.total.swept)],
                ["called", count(data.total.called)],
                ["reach", pct(data.total.reach_rate)],
                ["refusal", pct(data.total.refusal_rate)],
                ["deal", count(data.total.deal)],
                ["win", pct(data.total.win_rate)],
              ] as const
            ).map(([key, value]) => (
              <Card size="small" key={key}>
                <Statistic title={m.kpis[key]} value={value} />
              </Card>
            ))}
          </div>

          <Card size="small" title={m.funnel}>
            {data.total.swept === 0 ? (
              <Empty description={m.empty} />
            ) : (
              <FunnelBars row={data.total} />
            )}
          </Card>

          <Card size="small">
            <Tabs
              items={[
                {
                  key: "source",
                  label: m.by.source,
                  children: (
                    <SplitTable
                      rows={data.by_source}
                      name={m.by.source}
                      label={(row) => row.label ?? "—"}
                    />
                  ),
                },
                {
                  key: "axis",
                  label: m.by.axis,
                  children: (
                    <SplitTable
                      rows={data.by_axis}
                      name={m.by.axis}
                      label={(row) =>
                        row.key ? (axes[row.key] ?? row.key) : m.noAxis
                      }
                    />
                  ),
                },
                {
                  key: "list",
                  label: m.by.list,
                  children: (
                    <SplitTable
                      rows={data.by_list}
                      name={m.by.list}
                      label={(row) => row.label ?? m.noList}
                    />
                  ),
                },
                {
                  key: "month",
                  label: m.by.month,
                  children: (
                    <SplitTable
                      rows={data.by_month}
                      name={m.by.month}
                      label={(row) => row.key ?? "—"}
                    />
                  ),
                },
              ]}
            />
          </Card>

          <Card size="small" title={m.callsTitle}>
            <Table<CallMonth>
              rowKey="month"
              size="small"
              pagination={false}
              dataSource={data.calls}
              scroll={{ x: true }}
              locale={{ emptyText: m.empty }}
              columns={[
                { title: m.by.month, dataIndex: "month" },
                {
                  title: m.calls.calls,
                  dataIndex: "calls",
                  align: "right",
                  render: count,
                },
                {
                  title: m.stages.reached,
                  dataIndex: "reached",
                  align: "right",
                  render: count,
                },
                {
                  title: m.calls.refused,
                  dataIndex: "refused",
                  align: "right",
                  render: count,
                },
                {
                  title: m.stages.interested,
                  dataIndex: "interested",
                  align: "right",
                  render: count,
                },
                {
                  title: m.rates.reach,
                  dataIndex: "reach_rate",
                  align: "right",
                  render: pct,
                },
                {
                  title: m.rates.refusal,
                  dataIndex: "refusal_rate",
                  align: "right",
                  render: pct,
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
