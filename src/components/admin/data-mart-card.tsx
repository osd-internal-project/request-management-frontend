"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Table } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import {
  getMartStatus,
  refreshMart,
  type MartStatus,
  type MartTableStatus,
} from "@/lib/api/bi";
import { messages } from "@/lib/messages";

const m = messages.bi;

/**
 * CD-91 — when each Data Mart table was last rebuilt, and a button to rebuild
 * it now rather than wait for the hour (e.g. right before a meeting).
 */
export function DataMartCard() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<MartStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getMartStatus().then((result) => {
      if (result.ok) setStatus(result.data);
    });
  }, []);

  async function rebuild() {
    setBusy(true);
    const result = await refreshMart();
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    setStatus(result.data);
    void message.success(m.martRefreshed);
  }

  return (
    <Card
      title={m.martTitle}
      extra={
        <Button loading={busy} onClick={() => void rebuild()}>
          {m.martRefresh}
        </Button>
      }
    >
      <Text type="secondary" className="mb-3 block text-xs">
        {m.martHint(Math.round((status?.interval_ms ?? 0) / 60000))}
      </Text>
      <Table<MartTableStatus>
        size="small"
        rowKey="table_name"
        loading={!status}
        dataSource={status?.tables ?? []}
        pagination={false}
        columns={[
          {
            title: m.martColumns.table,
            dataIndex: "table_name",
            render: (name: string) => (
              <span>
                {m.martTables[name] ?? name}{" "}
                <Text type="secondary" className="text-xs">
                  mart.{name}
                </Text>
              </span>
            ),
          },
          {
            title: m.martColumns.rows,
            dataIndex: "row_count",
            width: 110,
            align: "right",
            render: (rows: number | null) =>
              rows === null ? "—" : rows.toLocaleString("th-TH"),
          },
          {
            title: m.martColumns.refreshedAt,
            dataIndex: "refreshed_at",
            width: 170,
            render: (at: string | null) =>
              at ? dayjs(at).format("D MMM YYYY HH:mm") : m.martNever,
          },
          {
            title: m.martColumns.duration,
            dataIndex: "duration_ms",
            width: 110,
            align: "right",
            render: (ms: number | null) => (ms === null ? "—" : ms),
          },
        ]}
      />
    </Card>
  );
}
