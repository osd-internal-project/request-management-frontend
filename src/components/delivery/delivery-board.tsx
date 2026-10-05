"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, DatePicker, Segmented, Space, Table, Tag, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import {
  READINESS_COLOR,
  thaiDate,
  type DeliveryBoardView,
} from "./delivery-types";

const m = messages.delivery;

type Row = DeliveryBoardView["items"][number];

/** CD-250 — the delivery team's board: every trip in a window, the unready first. */
export function DeliveryBoard({
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
  const [status, setStatus] = useState<"planned" | "delivered" | "cancelled">(
    "planned",
  );
  const key = `${range[0]}|${range[1]}|${status}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    view: DeliveryBoardView | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const [from, to, s] = key.split("|");
    void appApi<DeliveryBoardView>(
      `delivery/deliveries?from=${from}&to=${to}&status=${s}`,
    ).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { key, view: result.data, error: null }
          : { key, view: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [key]);

  const view = loaded?.key === key ? loaded.view : null;
  const rows = [...(view?.items ?? [])].sort(
    (a, b) =>
      Number(b.warning) - Number(a.warning) ||
      a.plannedOn.localeCompare(b.plannedOn),
  );

  return (
    <div className="space-y-3">
      <Space wrap>
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
        <Segmented
          value={status}
          onChange={setStatus}
          options={(["planned", "delivered", "cancelled"] as const).map(
            (value) => ({
              value,
              label: m.statuses[value],
            }),
          )}
        />
      </Space>
      {loaded?.error && loaded.key === key ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : (
        <Table<Row>
          rowKey="id"
          size="small"
          loading={!view}
          dataSource={rows}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          locale={{ emptyText: m.boardEmpty }}
          scroll={{ x: 900 }}
          columns={[
            {
              title: m.plannedOn,
              key: "date",
              width: 130,
              render: (_, row) => (
                <Space size={4}>
                  {thaiDate(row.plannedOn)}
                  {row.warning ? (
                    <Tooltip
                      title={m.warnTip.replace(
                        "{d}",
                        String(view?.warnDays ?? 7),
                      )}
                    >
                      <WarningOutlined className="text-orange-500" />
                    </Tooltip>
                  ) : null}
                </Space>
              ),
            },
            {
              title: m.project,
              key: "project",
              render: (_, row) =>
                row.project ? (
                  <Link href={`${ROUTES.projects}/${row.project.id}`}>
                    {row.project.label}
                  </Link>
                ) : (
                  "—"
                ),
            },
            {
              title: m.milestone,
              key: "ms",
              render: (_, row) =>
                row.milestone
                  ? `${row.milestone.seq}. ${row.milestone.title}`
                  : "—",
            },
            { title: "#", dataIndex: "seq", width: 50 },
            { title: m.location, dataIndex: "location" },
            {
              title: m.lines,
              key: "lines",
              render: (_, row) => (
                <Text className="text-xs">
                  {row.lines
                    .map((l) => `${l.label} × ${l.quantity}`)
                    .join(", ")}
                </Text>
              ),
            },
            {
              title: m.readiness,
              key: "ready",
              width: 120,
              render: (_, row) => (
                <Tag color={READINESS_COLOR[row.readiness]}>
                  {m.readinessLabels[row.readiness]}
                </Tag>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
