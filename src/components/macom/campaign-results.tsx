"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { SALES_AXES } from "@/lib/api/campaigns/axes";
import { messages } from "@/lib/messages";

const m = messages.campaignResults;
const axes = messages.campaigns.axes;
const kinds = messages.campaigns.kinds;

interface Totals {
  spent: number;
  leads: number;
  won_deals: number;
  booked: number;
  invoiced: number;
  paid: number;
  cost_per_lead: number | null;
  cost_per_won_deal: number | null;
  roi_paid: number | null;
  roi_booked: number | null;
}

interface CampaignRow extends Totals {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  kind: string;
  sales_axis: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  budget: number | null;
  converted: number;
  conversion: number | null;
}

interface MonthRow {
  month: string;
  spent: number;
  leads: number;
  won_deals: number;
  booked: number;
  invoiced: number;
  paid: number;
}

interface Overview {
  refreshed_at: string | null;
  totals: Totals & { campaigns: number };
  campaigns: CampaignRow[];
  months: MonthRow[];
}

const baht = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("th-TH", { maximumFractionDigits: 0 });
const times = (value: number | null) => (value === null ? "—" : m.times(value));

/** A row of the monthly table: the figures, and a bar for the money. */
function MonthTable({ rows }: { rows: MonthRow[] }) {
  const top = Math.max(
    1,
    ...rows.map((row) => Math.max(row.booked, row.spent)),
  );
  const bar = (value: number, color: string) => (
    <div
      className="h-1.5 rounded"
      style={{ width: `${(value / top) * 100}%`, background: color }}
    />
  );
  return (
    <Table<MonthRow>
      rowKey="month"
      size="small"
      pagination={false}
      dataSource={rows}
      scroll={{ x: true }}
      locale={{ emptyText: m.empty }}
      columns={[
        { title: m.month, dataIndex: "month" },
        {
          title: m.kpis.spent,
          dataIndex: "spent",
          align: "right",
          render: (value: number) => (
            <div className="min-w-24">
              {baht(value)}
              {bar(value, "#faad14")}
            </div>
          ),
        },
        { title: m.kpis.leads, dataIndex: "leads", align: "right" },
        { title: m.kpis.won_deals, dataIndex: "won_deals", align: "right" },
        {
          title: m.kpis.booked,
          dataIndex: "booked",
          align: "right",
          render: (value: number) => (
            <div className="min-w-24">
              {baht(value)}
              {bar(value, "#1677ff")}
            </div>
          ),
        },
        {
          title: m.kpis.invoiced,
          dataIndex: "invoiced",
          align: "right",
          render: baht,
        },
        {
          title: m.kpis.paid,
          dataIndex: "paid",
          align: "right",
          render: (value: number) => (
            <div className="min-w-24">
              {baht(value)}
              {bar(value, "#52c41a")}
            </div>
          ),
        },
      ]}
    />
  );
}

/**
 * CD-274 — campaign results to real revenue, from the Data Mart: totals,
 * each campaign's cost per Lead and per won deal and its money (booked →
 * invoiced → paid) against actual spend, and the months. Executive
 * dashboards read the same tables in Metabase.
 */
export function CampaignResults() {
  const [kind, setKind] = useState<string | undefined>();
  const [axis, setAxis] = useState<string | undefined>();
  const [from, setFrom] = useState<Dayjs | null>(
    dayjs().subtract(11, "month").startOf("month"),
  );
  const [to, setTo] = useState<Dayjs | null>(dayjs().startOf("month"));
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{
    name: string;
    months: MonthRow[] | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (axis) params.set("sales_axis", axis);
    if (from) params.set("from", from.format("YYYY-MM"));
    if (to) params.set("to", to.format("YYYY-MM"));
    void appApi<Overview>(`macom/results?${params.toString()}`).then(
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
  }, [kind, axis, from, to]);

  async function openCampaign(row: CampaignRow) {
    setOpen({ name: row.campaign_name, months: null });
    const result = await appApi<{ months: MonthRow[] }>(
      `macom/results/${row.campaign_id}`,
    );
    setOpen({
      name: row.campaign_name,
      months: result.ok ? result.data.months : [],
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          allowClear
          className="w-44"
          placeholder={m.allKinds}
          value={kind}
          onChange={setKind}
          options={(["campaign", "event"] as const).map((value) => ({
            value,
            label: kinds[value],
          }))}
        />
        <Select
          allowClear
          className="w-52"
          placeholder={m.allAxes}
          value={axis}
          onChange={setAxis}
          options={SALES_AXES.map((value) => ({ value, label: axes[value] }))}
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
              : m.notBuilt}
          </Text>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {(
              [
                ["spent", baht(data.totals.spent)],
                ["leads", data.totals.leads.toLocaleString("th-TH")],
                ["won_deals", data.totals.won_deals.toLocaleString("th-TH")],
                ["booked", baht(data.totals.booked)],
                ["paid", baht(data.totals.paid)],
                ["cost_per_lead", baht(data.totals.cost_per_lead)],
                ["cost_per_won_deal", baht(data.totals.cost_per_won_deal)],
                ["invoiced", baht(data.totals.invoiced)],
                ["roi_booked", times(data.totals.roi_booked)],
                ["roi_paid", times(data.totals.roi_paid)],
              ] as const
            ).map(([key, value]) => (
              <Card size="small" key={key}>
                <Statistic title={m.kpis[key]} value={value} />
              </Card>
            ))}
          </div>

          <Card size="small">
            {data.campaigns.length === 0 ? (
              <Empty description={m.empty} />
            ) : (
              <Table<CampaignRow>
                rowKey="campaign_id"
                size="small"
                dataSource={data.campaigns}
                pagination={{ pageSize: 50, hideOnSinglePage: true }}
                scroll={{ x: true }}
                onRow={(row) => ({ onClick: () => void openCampaign(row) })}
                rowClassName="cursor-pointer"
                columns={[
                  {
                    title: m.columns.campaign,
                    key: "campaign",
                    fixed: "left",
                    render: (_: unknown, row) => (
                      <div>
                        <Text strong>{row.campaign_name}</Text>
                        <div className="text-xs">
                          <Text type="secondary">{row.campaign_code}</Text>{" "}
                          {row.kind === "event" && (
                            <Tag color="purple">{kinds.event}</Tag>
                          )}
                          {row.sales_axis && (
                            <Tag color="blue">{axes[row.sales_axis]}</Tag>
                          )}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: m.kpis.spent,
                    dataIndex: "spent",
                    align: "right",
                    render: baht,
                    sorter: (a, b) => a.spent - b.spent,
                  },
                  {
                    title: m.kpis.leads,
                    dataIndex: "leads",
                    align: "right",
                    sorter: (a, b) => a.leads - b.leads,
                  },
                  {
                    title: m.kpis.won_deals,
                    dataIndex: "won_deals",
                    align: "right",
                  },
                  {
                    title: m.columns.conversion,
                    dataIndex: "conversion",
                    align: "right",
                    render: (value: number | null) =>
                      value === null ? "—" : `${Math.round(value * 100)}%`,
                  },
                  {
                    title: m.kpis.cost_per_lead,
                    dataIndex: "cost_per_lead",
                    align: "right",
                    render: baht,
                  },
                  {
                    title: m.kpis.cost_per_won_deal,
                    dataIndex: "cost_per_won_deal",
                    align: "right",
                    render: baht,
                  },
                  {
                    title: m.kpis.booked,
                    dataIndex: "booked",
                    align: "right",
                    render: baht,
                    sorter: (a, b) => a.booked - b.booked,
                    defaultSortOrder: "descend",
                  },
                  {
                    title: m.kpis.invoiced,
                    dataIndex: "invoiced",
                    align: "right",
                    render: baht,
                  },
                  {
                    title: m.kpis.paid,
                    dataIndex: "paid",
                    align: "right",
                    render: baht,
                    sorter: (a, b) => a.paid - b.paid,
                  },
                  {
                    title: m.kpis.roi_paid,
                    dataIndex: "roi_paid",
                    align: "right",
                    render: times,
                    sorter: (a, b) => (a.roi_paid ?? -1) - (b.roi_paid ?? -1),
                  },
                ]}
              />
            )}
          </Card>

          <Card size="small" title={m.monthly}>
            <MonthTable rows={data.months} />
          </Card>
        </>
      )}

      <Drawer
        open={open !== null}
        size={720}
        title={open ? m.campaignMonthly(open.name) : undefined}
        onClose={() => setOpen(null)}
        destroyOnHidden
      >
        {open?.months === null ? (
          <Spin />
        ) : (
          open && <MonthTable rows={open.months} />
        )}
      </Drawer>
    </div>
  );
}
