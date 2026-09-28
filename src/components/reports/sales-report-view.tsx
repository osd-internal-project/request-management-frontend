"use client";

import { useRouter } from "next/navigation";
import { Card, DatePicker, Empty, Progress, Table } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import type { SalesReport } from "@/lib/api/reports";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.salesReport;
const DATE = "YYYY-MM-DD";

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

type OwnerRow = SalesReport["by_owner"][number];
type ReasonRow = SalesReport["lost_reasons"][number];

/**
 * ช่วงเวลาของรายงาน — อยู่ใน URL เพื่อให้ลิงก์ที่ส่งต่อกันเปิดได้ตัวเลขชุดเดียวกัน.
 * ค่าที่แสดงคือช่วงที่ server ใช้จริง (รวมค่าตั้งต้นต้นเดือน) ไม่ใช่แค่สิ่งที่อยู่ใน URL.
 */
export function SalesReportFilters({
  from,
  to,
}: {
  readonly from?: string;
  readonly to?: string;
}) {
  const router = useRouter();

  function apply(range: [Dayjs, Dayjs] | null) {
    if (!range) {
      router.push(ROUTES.salesReport);
      return;
    }
    const params = new URLSearchParams({
      from: range[0].format(DATE),
      to: range[1].format(DATE),
    });
    router.push(`${ROUTES.salesReport}?${params.toString()}`);
  }

  const today = dayjs();
  const lastMonth = today.subtract(1, "month");

  return (
    <Card size="small">
      <span className="flex flex-wrap items-center gap-2">
        <Text type="secondary" className="text-xs">
          {m.filterPeriod}
        </Text>
        <DatePicker.RangePicker
          allowClear={false}
          value={from && to ? [dayjs(from), dayjs(to)] : null}
          onChange={(values) =>
            apply(values?.[0] && values[1] ? [values[0], values[1]] : null)
          }
          presets={[
            { label: m.thisMonth, value: [today.startOf("month"), today] },
            {
              label: m.lastMonth,
              value: [lastMonth.startOf("month"), lastMonth.endOf("month")],
            },
            { label: m.thisYear, value: [today.startOf("year"), today] },
          ]}
        />
      </span>
    </Card>
  );
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card size="small">
      <Text type="secondary" className="block text-xs">
        {label}
      </Text>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && (
        <Text type="secondary" className="block text-xs">
          {hint}
        </Text>
      )}
    </Card>
  );
}

/**
 * CD-83 — ตัวเลขทั้งหมดมาจาก server แล้ว ส่วนนี้แค่วาง. เป็น client component
 * เพราะ column ของ antd มี `render` ซึ่งข้ามขอบ server/client ไม่ได้.
 */
export function SalesReportView({ report }: { report: SalesReport }) {
  const { totals } = report;
  const lostTotal = report.lost_reasons.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <div className="space-y-4">
      <Text type="secondary" className="block text-xs">
        {m.periodLabel(report.period.from, report.period.to)}
      </Text>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label={m.salesAmount}
          value={baht(totals.sales_amount)}
          hint={m.salesAmountHint(totals.sale_order_count)}
        />
        <Figure
          label={m.winRate}
          value={percent(totals.win_rate)}
          hint={
            totals.win_rate === null
              ? m.winRateNone
              : m.winRateHint(totals.won_count, totals.lost_count)
          }
        />
        <Figure
          label={m.wonAmount}
          value={baht(totals.won_amount)}
          hint={`${m.lostAmount} ${baht(totals.lost_amount)}`}
        />
        <Figure
          label={m.openPipeline}
          value={baht(totals.open_amount)}
          hint={m.openPipelineHint(totals.open_count)}
        />
      </div>

      <Card size="small" title={m.byOwnerTitle}>
        {report.by_owner.length ? (
          <Table<OwnerRow>
            rowKey="owner_user_id"
            size="small"
            dataSource={report.by_owner}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            scroll={{ x: true }}
            columns={[
              { title: m.columns.owner, dataIndex: "owner_name" },
              {
                title: m.columns.sales,
                dataIndex: "sales_amount",
                align: "right",
                render: baht,
              },
              {
                title: m.columns.saleOrders,
                dataIndex: "sale_order_count",
                align: "right",
              },
              { title: m.columns.won, dataIndex: "won_count", align: "right" },
              {
                title: m.columns.lost,
                dataIndex: "lost_count",
                align: "right",
              },
              {
                title: m.columns.winRate,
                dataIndex: "win_rate",
                align: "right",
                render: percent,
              },
              {
                title: m.columns.open,
                dataIndex: "open_amount",
                align: "right",
                render: baht,
              },
            ]}
          />
        ) : (
          <Empty description={m.byOwnerEmpty} />
        )}
      </Card>

      <Card size="small" title={m.lostReasonsTitle}>
        {report.lost_reasons.length ? (
          <Table<ReasonRow>
            rowKey={(row) => row.code ?? "-"}
            size="small"
            dataSource={report.lost_reasons}
            pagination={false}
            scroll={{ x: true }}
            columns={[
              { title: m.columns.reason, dataIndex: "name" },
              { title: m.columns.count, dataIndex: "count", align: "right" },
              {
                title: m.columns.share,
                dataIndex: "count",
                key: "share",
                width: 200,
                render: (count: number) => (
                  <Progress
                    size="small"
                    percent={Math.round((count / lostTotal) * 100)}
                  />
                ),
              },
              {
                title: m.columns.amount,
                dataIndex: "amount",
                align: "right",
                render: baht,
              },
            ]}
          />
        ) : (
          <Empty description={m.lostReasonsEmpty} />
        )}
      </Card>

      <Text type="secondary" className="block text-xs">
        {m.definitions}
      </Text>
    </div>
  );
}
