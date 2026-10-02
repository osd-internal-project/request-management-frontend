"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  Checkbox,
  DatePicker,
  Progress,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.pricing.analytics;
const kinds = messages.pricing.exceptions.kinds;
const decisions = messages.pricing.exceptions.decisions;
const workTypes = messages.sales.quotations.detail.workTypes;

interface Row {
  key: string | null;
  quotations: number;
  gross: number;
  discount: number;
  net: number;
  cost: number;
  margin: number;
  margin_pct: number | null;
  discount_pct: number | null;
}

interface Overview {
  refreshed_at: string | null;
  totals: Row;
  monthly: Row[];
  by: Record<string, Row[]>;
  exceptions: {
    month: string;
    kind: string;
    decision: string;
    count: number;
  }[];
}

const money = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 0 });
const pct = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(2)}%`;

/** A percentage as a thin bar beside its number. */
function Bar({
  value,
  max,
  color,
}: {
  value: number | null;
  max: number;
  color: string;
}) {
  if (value === null) return <>—</>;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-right tabular-nums">{pct(value)}</span>
      <Progress
        percent={max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}
        showInfo={false}
        size="small"
        strokeColor={color}
        className="!m-0 min-w-24 flex-1"
      />
    </div>
  );
}

function labelOf(breakdown: string, key: string | null) {
  if (key === null || key === "") return m.unknown;
  if (breakdown === "work_type") return workTypes[key] ?? key;
  return key;
}

/**
 * CD-208 — วิเคราะห์ราคาและกำไร: margin and discount over approved quotation
 * versions, by customer, work type, salesperson, cost vendor and product
 * group, with the monthly trend and exceptions. Pricing only.
 */
export function PricingAnalytics() {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().subtract(11, "month").startOf("month"),
    dayjs().startOf("month"),
  ]);
  const [acceptedOnly, setAcceptedOnly] = useState(false);
  const key = `${range?.[0]?.format("YYYY-MM") ?? ""}|${range?.[1]?.format("YYYY-MM") ?? ""}|${acceptedOnly}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    data: Overview | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const [from, to, accepted] = key.split("|");
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (accepted === "true") params.set("accepted_only", "true");
    void appApi<Overview>(`pricing/analytics?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, data: result.data, error: null }
            : { key, data: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const data = loaded?.key === key ? loaded.data : null;

  const columns = (breakdown: string, rows: Row[]) => {
    const maxMargin = Math.max(1, ...rows.map((row) => row.margin_pct ?? 0));
    const maxDiscount = Math.max(
      1,
      ...rows.map((row) => row.discount_pct ?? 0),
    );
    return [
      {
        title: breakdown === "month" ? m.month : m.breakdowns[breakdown],
        key: "key",
        width: 220,
        render: (_: unknown, row: Row) =>
          breakdown === "month" ? row.key : labelOf(breakdown, row.key),
      },
      {
        title: m.quotations,
        dataIndex: "quotations",
        width: 100,
        align: "right" as const,
      },
      {
        title: m.net,
        dataIndex: "net",
        width: 130,
        align: "right" as const,
        render: (value: number) => money(value),
      },
      {
        title: m.margin,
        dataIndex: "margin",
        width: 130,
        align: "right" as const,
        render: (value: number) => money(value),
      },
      {
        title: m.marginPct,
        dataIndex: "margin_pct",
        width: 200,
        render: (value: number | null) => (
          <Bar value={value} max={maxMargin} color="#16a34a" />
        ),
      },
      {
        title: m.discountPct,
        dataIndex: "discount_pct",
        width: 200,
        render: (value: number | null) => (
          <Bar value={value} max={maxDiscount} color="#ea580c" />
        ),
      },
    ];
  };

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
        <Text type="secondary" className="block text-xs">
          {data?.refreshed_at
            ? m.refreshedAt(dayjs(data.refreshed_at).format("DD/MM/YYYY HH:mm"))
            : data
              ? m.notRefreshed
              : ""}
        </Text>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Text>{m.range}</Text>
        <DatePicker.RangePicker
          picker="month"
          value={range}
          onChange={(value) =>
            setRange(value as [Dayjs | null, Dayjs | null] | null)
          }
        />
        <Checkbox
          checked={acceptedOnly}
          onChange={(event) => setAcceptedOnly(event.target.checked)}
        >
          {m.acceptedOnly}
        </Checkbox>
      </div>

      {loaded?.key === key && loaded.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !data ? (
        <Skeleton active />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {[
              [m.gross, money(data.totals.gross)],
              [
                m.discount,
                `${money(data.totals.discount)} (${pct(data.totals.discount_pct)})`,
              ],
              [m.net, money(data.totals.net)],
              [m.cost, money(data.totals.cost)],
              [m.margin, money(data.totals.margin)],
              [m.marginPct, pct(data.totals.margin_pct)],
            ].map(([title, value]) => (
              <Card key={title} size="small">
                <Statistic title={title} value={value} />
              </Card>
            ))}
          </div>

          <Card size="small" title={m.trend}>
            <Table<Row>
              rowKey={(row) => row.key ?? "none"}
              size="small"
              pagination={false}
              scroll={{ x: 980 }}
              locale={{ emptyText: m.empty }}
              dataSource={data.monthly}
              columns={columns("month", data.monthly)}
            />
          </Card>

          <Card size="small">
            <Tabs
              items={Object.keys(m.breakdowns).map((breakdown) => ({
                key: breakdown,
                label: m.breakdowns[breakdown],
                children: (
                  <>
                    <Text type="secondary" className="mb-2 block text-xs">
                      {m.top}
                      {breakdown === "vendor" ? ` · ${m.vendorHint}` : ""}
                    </Text>
                    <Table<Row>
                      rowKey={(row) => row.key ?? "none"}
                      size="small"
                      pagination={false}
                      scroll={{ x: 980 }}
                      locale={{ emptyText: m.empty }}
                      dataSource={data.by[breakdown] ?? []}
                      columns={columns(breakdown, data.by[breakdown] ?? [])}
                    />
                  </>
                ),
              }))}
            />
          </Card>

          <Card size="small" title={m.exceptions}>
            <Table
              rowKey={(row) => `${row.month}|${row.kind}|${row.decision}`}
              size="small"
              pagination={false}
              locale={{ emptyText: m.empty }}
              dataSource={data.exceptions}
              columns={[
                { title: m.month, dataIndex: "month", width: 120 },
                {
                  title: messages.pricing.exceptions.kind,
                  dataIndex: "kind",
                  render: (value: string) => kinds[value] ?? value,
                },
                {
                  title: messages.pricing.exceptions.decision,
                  dataIndex: "decision",
                  render: (value: string) => (
                    <Tag>{decisions[value] ?? value}</Tag>
                  ),
                },
                {
                  title: m.quotations,
                  dataIndex: "count",
                  align: "right" as const,
                  width: 100,
                },
              ]}
            />
          </Card>
        </>
      )}
    </Space>
  );
}
