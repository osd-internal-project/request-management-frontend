"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Empty, Segmented, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { CrmDashboard } from "@/lib/api/reports";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.crmDashboard;
const stageLabel = messages.sales.opportunities.stage;
const stageColor = messages.sales.opportunities.stageColor;

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

type StageRow = CrmDashboard["opportunities"]["by_stage"][number];

/** ของฉัน / ทั้งหมดที่เห็นได้ — อยู่ใน URL เพื่อให้ลิงก์ที่ส่งต่อเปิดมุมเดียวกัน. */
export function CrmDashboardViewSwitch({ view }: { view: "mine" | "team" }) {
  const router = useRouter();

  return (
    <Segmented
      value={view}
      onChange={(value) =>
        router.push(
          value === "mine"
            ? `${ROUTES.crmDashboard}?view=mine`
            : ROUTES.crmDashboard,
        )
      }
      options={[
        { value: "team", label: m.viewTeam },
        { value: "mine", label: m.viewMine },
      ]}
    />
  );
}

function Figure({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "danger" | "warning";
}) {
  return (
    <Card size="small">
      <div className="flex items-baseline justify-between gap-2">
        <Text type="secondary" className="text-xs">
          {label}
        </Text>
        {href && (
          <Link href={href} className="text-xs">
            {m.openList}
          </Link>
        )}
      </div>
      <div className="text-2xl font-semibold">
        {tone ? <Text type={tone}>{value}</Text> : value}
      </div>
      {hint && (
        <Text type="secondary" className="block text-xs">
          {hint}
        </Text>
      )}
    </Card>
  );
}

/**
 * CD-73 — วางตัวเลขที่ server รวมมาแล้ว. เป็น client component เพราะ column
 * ของ antd มี `render` ซึ่งข้ามขอบ server/client ไม่ได้.
 */
export function CrmDashboardView({ dashboard }: { dashboard: CrmDashboard }) {
  const { customers, leads, opportunities, activities } = dashboard;
  const mine = dashboard.view === "mine";

  return (
    <div className="space-y-4">
      <Text type="secondary" className="block text-xs">
        {m.monthNote(dashboard.month_from)}
      </Text>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* ไม่มีสิทธิ์ทะเบียนลูกค้า = ไม่แสดงการ์ด ไม่ใช่แสดง 0 */}
        {customers && (
          <Figure
            label={m.customersActive}
            value={customers.active.toLocaleString("th-TH")}
            hint={m.customersNew(customers.new_this_month)}
            href={ROUTES.customers}
          />
        )}
        <Figure
          label={m.leadsOpen}
          value={leads.open.toLocaleString("th-TH")}
          hint={m.leadsNew(leads.new_this_month)}
          href={ROUTES.leads}
        />
        <Figure
          label={m.pipeline}
          value={baht(opportunities.open_amount)}
          hint={m.pipelineHint(
            opportunities.open_count,
            baht(opportunities.weighted_amount),
          )}
          href={
            mine ? `${ROUTES.opportunities}?view=mine` : ROUTES.opportunities
          }
        />
        <Figure
          label={m.wonThisMonth}
          value={baht(opportunities.won_this_month.amount)}
          hint={m.wonHint(opportunities.won_this_month.count)}
          href={ROUTES.salesReport}
        />
      </div>

      <Card size="small" title={m.activitiesTitle}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure
            label={m.overdue}
            value={activities.overdue.toLocaleString("th-TH")}
            tone={activities.overdue ? "danger" : undefined}
          />
          <Figure
            label={m.dueSoon}
            value={activities.due_soon.toLocaleString("th-TH")}
          />
          <Figure
            label={m.completed}
            value={activities.completed_this_month.toLocaleString("th-TH")}
          />
          <Figure
            label={m.stale}
            value={opportunities.stale_count.toLocaleString("th-TH")}
            tone={opportunities.stale_count ? "warning" : undefined}
            href={`${ROUTES.opportunities}?follow_up=stale${mine ? "&view=mine" : ""}`}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card size="small" title={m.pipelineByStage}>
          <Table<StageRow>
            rowKey="stage"
            size="small"
            dataSource={opportunities.by_stage}
            pagination={false}
            scroll={{ x: true }}
            columns={[
              {
                title: m.stageColumns.stage,
                dataIndex: "stage",
                render: (stage: string) => (
                  <Tag color={stageColor[stage]}>
                    {stageLabel[stage] ?? stage}
                  </Tag>
                ),
              },
              {
                title: m.stageColumns.count,
                dataIndex: "count",
                align: "right",
              },
              {
                title: m.stageColumns.amount,
                dataIndex: "amount",
                align: "right",
                render: baht,
              },
              {
                title: m.stageColumns.weighted,
                dataIndex: "weighted_amount",
                align: "right",
                render: baht,
              },
            ]}
          />
        </Card>

        <Card size="small" title={m.leadsByStatus}>
          {leads.by_status.some((row) => row.count) ? (
            <div className="space-y-2">
              {leads.by_status.map((row) => (
                <div
                  key={row.code}
                  className="flex items-center justify-between gap-2"
                >
                  <Tag color={row.color}>{row.name}</Tag>
                  <Text
                    strong={row.count > 0}
                    type={row.count ? undefined : "secondary"}
                  >
                    {row.count.toLocaleString("th-TH")}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <Empty description={m.leadsEmpty} />
          )}
        </Card>
      </div>
    </div>
  );
}
