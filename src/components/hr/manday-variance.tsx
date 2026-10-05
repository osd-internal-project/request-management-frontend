"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Descriptions,
  Drawer,
  Progress,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.hr.mandays;

type PlanSource = "budget" | "solution" | null;

interface ProjectRow {
  id: string;
  label: string;
  status: string;
  managerUserId: string;
  planned: number;
  planSource: PlanSource;
  budgetVersionNo: number;
  actual: number;
  percent: number | null;
  variance: number;
}

interface Detail {
  project: {
    id: string;
    label: string;
    status: string;
    startOn: string | null;
    endOn: string;
  };
  planned: number;
  planSource: PlanSource;
  budgetVersionNo: number;
  solutionMandays: number;
  actual: number;
  actualHours: number;
  billableMandays: number;
  percent: number | null;
  variance: number;
  breakdown: {
    levelCode: string | null;
    workTypeCode: string | null;
    levelName: string | null;
    workTypeName: string | null;
    planned: number;
    actual: number;
    variance: number;
    percent: number | null;
  }[];
  people: {
    userId: string;
    name: string;
    plannedMandays: number;
    plannedToDateMandays: number;
    actualMandays: number;
    percentToDate: number | null;
  }[];
  alerts: {
    budgetVersionNo: number;
    threshold: number;
    planned: number;
    actual: number;
    sentAt: string;
  }[];
}

/** Green to 100 %, orange past it, red past 120 %. */
function percentColor(percent: number | null) {
  if (percent === null) return undefined;
  if (percent > 120) return "#cf1322";
  if (percent > 100) return "#d46b08";
  return undefined;
}

function Burn({ percent }: { percent: number | null }) {
  if (percent === null) return <Text type="secondary">{m.noPlan}</Text>;
  return (
    <Progress
      percent={Math.min(percent, 100)}
      format={() => `${percent}%`}
      strokeColor={percentColor(percent)}
      size="small"
      status={percent > 100 ? "exception" : "normal"}
    />
  );
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

/**
 * CD-233 — manday plan against actual: every project the caller may see,
 * and one in detail — by HR level × work type and by person.
 */
export function MandayVariance() {
  const [loaded, setLoaded] = useState<{
    items: ProjectRow[] | null;
    error: string | null;
  } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    id: string;
    data: Detail | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    void appApi<{ items: ProjectRow[] }>("hr/mandays").then((result) =>
      setLoaded(
        result.ok
          ? { items: result.data.items, error: null }
          : { items: null, error: result.message },
      ),
    );
  }, []);

  useEffect(() => {
    if (!openId) return;
    let live = true;
    void appApi<Detail>(`hr/mandays/${openId}`).then((result) => {
      if (!live) return;
      setDetail(
        result.ok
          ? { id: openId, data: result.data, error: null }
          : { id: openId, data: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [openId]);

  const data = detail?.id === openId ? detail.data : null;

  if (loaded?.error)
    return <Alert type="error" showIcon title={loaded.error} />;
  return (
    <>
      <Table<ProjectRow>
        rowKey="id"
        size="small"
        loading={!loaded}
        dataSource={loaded?.items ?? []}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 900 }}
        onRow={(row) => ({
          onClick: () => setOpenId(row.id),
          className: "cursor-pointer",
        })}
        columns={[
          { title: m.project, dataIndex: "label" },
          {
            title: m.status,
            dataIndex: "status",
            width: 110,
            render: (status: string) => (
              <Tag>{m.statuses[status] ?? status}</Tag>
            ),
          },
          {
            title: m.planned,
            key: "planned",
            align: "right",
            width: 130,
            render: (_, row) => (
              <Space orientation="vertical" size={0}>
                <span>{row.planned}</span>
                <Text type="secondary" className="text-xs">
                  {row.planSource === "budget"
                    ? m.fromBudget.replace("{v}", String(row.budgetVersionNo))
                    : row.planSource === "solution"
                      ? m.fromSolution
                      : m.noPlan}
                </Text>
              </Space>
            ),
          },
          { title: m.actual, dataIndex: "actual", align: "right", width: 100 },
          {
            title: m.variance,
            dataIndex: "variance",
            align: "right",
            width: 100,
            render: (value: number, row) => (
              <Text style={{ color: percentColor(row.percent) }}>
                {signed(value)}
              </Text>
            ),
          },
          {
            title: m.used,
            key: "percent",
            width: 200,
            render: (_, row) => <Burn percent={row.percent} />,
          },
        ]}
      />

      <Drawer
        open={!!openId}
        size="80%"
        title={data?.project.label ?? m.loading}
        onClose={() => setOpenId(null)}
      >
        {detail?.id === openId && detail.error ? (
          <Alert type="error" showIcon title={detail.error} />
        ) : !data ? (
          <Skeleton active />
        ) : (
          <div className="space-y-5">
            <Descriptions
              size="small"
              bordered
              column={{ xs: 1, md: 3 }}
              items={[
                {
                  key: "planned",
                  label: m.planned,
                  children: `${data.planned} ${m.md} (${
                    data.planSource === "budget"
                      ? m.fromBudget.replace(
                          "{v}",
                          String(data.budgetVersionNo),
                        )
                      : data.planSource === "solution"
                        ? m.fromSolution
                        : m.noPlan
                  })`,
                },
                {
                  key: "solution",
                  label: m.solutionEstimate,
                  children: `${data.solutionMandays} ${m.md}`,
                },
                {
                  key: "actual",
                  label: m.actual,
                  children: `${data.actual} ${m.md} (${data.actualHours} ${m.hours}) · ${m.billable} ${data.billableMandays}`,
                },
                {
                  key: "variance",
                  label: m.variance,
                  children: (
                    <Text style={{ color: percentColor(data.percent) }}>
                      {signed(data.variance)} {m.md}
                    </Text>
                  ),
                },
                {
                  key: "used",
                  label: m.used,
                  span: 2,
                  children: <Burn percent={data.percent} />,
                },
              ]}
            />

            <div>
              <Text strong className="mb-2 block">
                {m.byLevelWork}
              </Text>
              <Table
                rowKey={(row) => `${row.levelCode}|${row.workTypeCode}`}
                size="small"
                pagination={false}
                dataSource={data.breakdown}
                locale={{ emptyText: m.noBreakdown }}
                columns={[
                  {
                    title: m.level,
                    key: "level",
                    render: (_, row) =>
                      row.levelCode
                        ? `${row.levelCode}${row.levelName ? ` · ${row.levelName}` : ""}`
                        : m.unspecified,
                  },
                  {
                    title: m.workType,
                    key: "workType",
                    render: (_, row) =>
                      row.workTypeCode
                        ? (row.workTypeName ?? row.workTypeCode)
                        : m.unspecified,
                  },
                  {
                    title: m.solutionEstimate,
                    dataIndex: "planned",
                    align: "right",
                  },
                  { title: m.actual, dataIndex: "actual", align: "right" },
                  {
                    title: m.variance,
                    dataIndex: "variance",
                    align: "right",
                    render: (value: number, row) => (
                      <Text style={{ color: percentColor(row.percent) }}>
                        {signed(value)}
                      </Text>
                    ),
                  },
                  {
                    title: m.used,
                    key: "pct",
                    width: 180,
                    render: (_, row) => <Burn percent={row.percent} />,
                  },
                ]}
              />
              <Text type="secondary" className="mt-1 block text-xs">
                {m.breakdownHint}
              </Text>
            </div>

            <div>
              <Text strong className="mb-2 block">
                {m.byPerson}
              </Text>
              <Table
                rowKey="userId"
                size="small"
                pagination={false}
                dataSource={data.people}
                locale={{ emptyText: m.noPeople }}
                columns={[
                  { title: m.person, dataIndex: "name" },
                  {
                    title: m.booked,
                    dataIndex: "plannedMandays",
                    align: "right",
                  },
                  {
                    title: m.bookedToDate,
                    dataIndex: "plannedToDateMandays",
                    align: "right",
                  },
                  {
                    title: m.actual,
                    dataIndex: "actualMandays",
                    align: "right",
                  },
                  {
                    title: m.usedToDate,
                    key: "pct",
                    width: 180,
                    render: (_, row) => <Burn percent={row.percentToDate} />,
                  },
                ]}
              />
              <Text type="secondary" className="mt-1 block text-xs">
                {m.peopleHint}
              </Text>
            </div>

            {data.alerts.length ? (
              <div>
                <Text strong className="mb-2 block">
                  {m.alerts}
                </Text>
                <Space wrap>
                  {data.alerts.map((alert) => (
                    <Tag key={`${alert.budgetVersionNo}-${alert.threshold}`}>
                      {alert.threshold === 0
                        ? m.closedSummary
                        : `${alert.threshold}%`}{" "}
                      ·{" "}
                      {m.budgetV.replace("{v}", String(alert.budgetVersionNo))}{" "}
                      · {new Date(alert.sentAt).toLocaleDateString("th-TH")}
                    </Tag>
                  ))}
                </Space>
              </div>
            ) : null}
          </div>
        )}
      </Drawer>
    </>
  );
}
