"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  DatePicker,
  Drawer,
  Segmented,
  Skeleton,
  Statistic,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.hr.laborCosts;

type Group = "request" | "type" | "month" | "person";

interface Totals {
  hours: number;
  mandays: number;
  cost: number;
  unpricedHours: number;
}

interface Report {
  from: string;
  to: string;
  group: Group;
  totals: Totals;
  billableHours: number;
  rows: (Totals & {
    key: string;
    label: string;
    customer: string | null;
    status: string | null;
  })[];
}

interface RequestDetail {
  request: {
    id: string;
    label: string;
    customer: string | null;
    status: string;
  };
  totals: Totals;
  lines: {
    userId: string;
    name: string;
    date: string;
    hours: number;
    level: string | null;
    workType: string | null;
    costPerManday: number | null;
    cost: number | null;
    billable: boolean;
  }[];
}

const baht = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * CD-234 — service labour cost: approved hours on service cases × the cost
 * rate of the day worked, by case, type, month or person; one case in detail.
 */
export function ServiceLaborCosts({
  from: initialFrom,
  to: initialTo,
}: {
  from: string;
  to: string;
}) {
  const [range, setRange] = useState<[string, string]>([
    initialFrom,
    initialTo,
  ]);
  const [group, setGroup] = useState<Group>("request");
  const [loaded, setLoaded] = useState<{
    key: string;
    data: Report | null;
    error: string | null;
  } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    id: string;
    data: RequestDetail | null;
    error: string | null;
  } | null>(null);
  const key = `${range[0]}|${range[1]}|${group}`;

  useEffect(() => {
    let live = true;
    const [from, to, g] = key.split("|");
    void appApi<Report>(
      `hr/labor-costs/service?from=${from}&to=${to}&group=${g}`,
    ).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { key, data: result.data, error: null }
          : { key, data: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    if (!openId) return;
    let live = true;
    void appApi<RequestDetail>(`hr/labor-costs/service/${openId}`).then(
      (result) => {
        if (!live) return;
        setDetail(
          result.ok
            ? { id: openId, data: result.data, error: null }
            : { id: openId, data: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [openId]);

  const data = loaded?.key === key ? loaded.data : null;
  const shown = detail?.id === openId ? detail : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker.RangePicker
          allowClear={false}
          format="DD/MM/YYYY"
          value={[dayjs(range[0]), dayjs(range[1])]}
          onChange={(values) => {
            const [a, b] = (values ?? []) as [Dayjs | null, Dayjs | null];
            if (a && b)
              setRange([a.format("YYYY-MM-DD"), b.format("YYYY-MM-DD")]);
          }}
        />
        <Segmented<Group>
          value={group}
          onChange={setGroup}
          options={[
            { value: "request", label: m.groups.request },
            { value: "type", label: m.groups.type },
            { value: "month", label: m.groups.month },
            { value: "person", label: m.groups.person },
          ]}
        />
      </div>

      {loaded?.error && loaded.key === key ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !data ? (
        <Skeleton active />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Statistic
              title={m.cost}
              value={baht(data.totals.cost)}
              suffix={m.baht}
            />
            <Statistic title={m.mandays} value={data.totals.mandays} />
            <Statistic
              title={m.billableHours}
              value={data.billableHours}
              suffix={m.hours}
            />
            <Statistic
              title={m.unpriced}
              value={data.totals.unpricedHours}
              suffix={m.hours}
              styles={{
                content: data.totals.unpricedHours
                  ? { color: "#d46b08" }
                  : undefined,
              }}
            />
          </div>
          {data.totals.unpricedHours ? (
            <Alert type="warning" showIcon title={m.unpricedHint} />
          ) : null}
          <Table
            rowKey="key"
            size="small"
            dataSource={data.rows}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            locale={{ emptyText: m.empty }}
            scroll={{ x: 760 }}
            onRow={(row) =>
              group === "request"
                ? {
                    onClick: () => setOpenId(row.key),
                    className: "cursor-pointer",
                  }
                : {}
            }
            columns={[
              { title: m.groups[group], dataIndex: "label" },
              ...(group === "request"
                ? [
                    {
                      title: m.customer,
                      dataIndex: "customer",
                      render: (value: string | null) => value ?? "—",
                    },
                    {
                      title: m.status,
                      dataIndex: "status",
                      render: (value: string | null) =>
                        value ? <Tag>{value}</Tag> : null,
                    },
                  ]
                : []),
              {
                title: m.hoursCol,
                dataIndex: "hours",
                align: "right" as const,
              },
              {
                title: m.mandays,
                dataIndex: "mandays",
                align: "right" as const,
              },
              {
                title: m.unpriced,
                dataIndex: "unpricedHours",
                align: "right" as const,
                render: (value: number) =>
                  value ? <Text type="warning">{value}</Text> : "—",
              },
              {
                title: m.cost,
                dataIndex: "cost",
                align: "right" as const,
                render: (value: number) => baht(value),
              },
            ]}
          />
        </>
      )}

      <Drawer
        open={!!openId}
        size="70%"
        title={shown?.data?.request.label ?? m.loading}
        onClose={() => setOpenId(null)}
      >
        {shown?.error ? (
          <Alert type="error" showIcon title={shown.error} />
        ) : !shown?.data ? (
          <Skeleton active />
        ) : (
          <div className="space-y-3">
            <Text type="secondary">
              {m.allTime} · {m.cost} {baht(shown.data.totals.cost)} {m.baht} ·{" "}
              {shown.data.totals.mandays} {m.mandays}
            </Text>
            <Table
              rowKey={(row) =>
                `${row.userId}|${row.date}|${row.workType}|${row.hours}`
              }
              size="small"
              pagination={false}
              dataSource={shown.data.lines}
              scroll={{ x: 760 }}
              columns={[
                {
                  title: m.date,
                  dataIndex: "date",
                  render: (value: string) =>
                    new Date(`${value}T00:00:00Z`).toLocaleDateString("th-TH", {
                      timeZone: "UTC",
                    }),
                },
                { title: m.person, dataIndex: "name" },
                {
                  title: m.level,
                  dataIndex: "level",
                  render: (value: string | null) =>
                    value ?? <Text type="warning">{m.noLevel}</Text>,
                },
                { title: m.workType, dataIndex: "workType" },
                { title: m.hoursCol, dataIndex: "hours", align: "right" },
                {
                  title: m.rate,
                  dataIndex: "costPerManday",
                  align: "right",
                  render: (value: number | null) =>
                    value === null ? (
                      <Text type="warning">{m.noRate}</Text>
                    ) : (
                      baht(value)
                    ),
                },
                {
                  title: m.cost,
                  dataIndex: "cost",
                  align: "right",
                  render: (value: number | null) =>
                    value === null ? "—" : baht(value),
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
