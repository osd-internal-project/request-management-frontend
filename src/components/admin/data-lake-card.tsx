"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Table, Tag, Tooltip } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import {
  getLakeStatus,
  runLake,
  type LakeStatus,
  type LakeTableStatus,
} from "@/lib/api/bi";
import { messages } from "@/lib/messages";

const m = messages.bi;

/**
 * CD-90 — the Data Lake feed: how far each table has been sent, its last run
 * and error, and which columns never leave the application. "Send now" runs
 * the hourly extract immediately.
 */
export function DataLakeCard() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<LakeStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getLakeStatus().then((result) => {
      if (result.ok) setStatus(result.data);
    });
  }, []);

  async function run() {
    setBusy(true);
    const result = await runLake();
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    setStatus(result.data);
    void message.success(m.lakeRan);
  }

  const configured = status?.configured ?? false;

  return (
    <Card
      title={m.lakeTitle}
      extra={
        configured ? (
          <Button loading={busy} onClick={() => void run()}>
            {m.lakeRun}
          </Button>
        ) : null
      }
    >
      {status && !configured ? (
        <Alert type="info" showIcon title={m.lakeNotConfigured} />
      ) : (
        <>
          <Text type="secondary" className="mb-3 block text-xs">
            {m.lakeHint(Math.round((status?.interval_ms ?? 0) / 60000))}
          </Text>
          <Table<LakeTableStatus>
            size="small"
            rowKey="table_name"
            loading={!status}
            dataSource={status?.tables ?? []}
            pagination={false}
            scroll={{ x: 760 }}
            columns={[
              {
                title: m.lakeColumns.table,
                dataIndex: "table_name",
                render: (name: string, row) =>
                  row.last_error ? (
                    <Tooltip title={row.last_error}>
                      <Text type="danger">{name}</Text>
                    </Tooltip>
                  ) : (
                    name
                  ),
              },
              {
                title: m.lakeColumns.module,
                dataIndex: "module",
                width: 110,
                render: (module: string) => (
                  <Tag>{m.lakeModules[module] ?? module}</Tag>
                ),
              },
              {
                title: m.lakeColumns.upTo,
                dataIndex: "watermark",
                width: 150,
                render: (at: string | null) =>
                  at
                    ? dayjs(`${at.slice(0, 19)}Z`).format("D MMM YY HH:mm")
                    : m.lakeNever,
              },
              {
                title: m.lakeColumns.lastRun,
                dataIndex: "last_run_at",
                width: 150,
                render: (at: string | null) =>
                  at ? dayjs(at).format("D MMM YY HH:mm") : m.lakeNever,
              },
              {
                title: m.lakeColumns.total,
                dataIndex: "total_rows",
                width: 100,
                align: "right",
                render: (rows: number) => rows.toLocaleString("th-TH"),
              },
              {
                title: m.lakeColumns.excluded,
                dataIndex: "excluded_columns",
                render: (columns: string[]) =>
                  columns.length ? (
                    <Text type="secondary" className="text-xs">
                      {columns.join(", ")}
                    </Text>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        </>
      )}
    </Card>
  );
}
