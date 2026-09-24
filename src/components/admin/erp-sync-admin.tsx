"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Empty, Popconfirm, Segmented, Table, Tag, Tooltip } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import {
  getCatalogStatus,
  listErpJobs,
  retryErpJob,
  syncCatalog,
  type CatalogStatus,
  type ErpJobFilter,
  type ErpJobList,
  type ErpJobRow,
} from "@/lib/api/erp-sync";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.erpSync;

function when(iso: string): string {
  return dayjs(iso).format("D MMM YY HH:mm");
}

/**
 * CM-06 / CD-88 — รายการงานในคิวส่ง SAP ของบริษัทที่ทำงานอยู่.
 *
 * ค่าตั้งต้นเปิดที่ "ส่งไม่สำเร็จ" เพราะเป็นกลุ่มเดียวที่หยุดลองเองแล้วและต้องมีคน
 * ลงมือ — "รอส่ง" ยังลองเองอยู่ ดูได้แต่ปกติไม่ต้องทำอะไร.
 */
export function ErpSyncAdmin() {
  const { message } = App.useApp();
  const [filter, setFilter] = useState<ErpJobFilter>("failed");
  const [data, setData] = useState<ErpJobList | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  // .then keeps every setState inside an async callback (react-hooks/
  // set-state-in-effect); the loading flag is raised by whoever asks, not here.
  const load = useCallback(
    (status: ErpJobFilter) =>
      listErpJobs(status).then((result) => {
        setLoading(false);
        if (result.ok) setData(result.data);
        else message.error(result.message);
      }),
    [message],
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  function reload(status: ErpJobFilter = filter) {
    setLoading(true);
    if (status === filter) void load(status);
    else setFilter(status);
  }

  async function retry(row: ErpJobRow) {
    setRetrying(row.id);
    const result = await retryErpJob(row.id);
    setRetrying(null);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    // The backend waited for the send — say what actually happened.
    const done = result.data;
    const code = row.resource.code;
    // Retry resets attempts to 0 — any attempt since is the new try failing.
    if (done.status === "succeeded") message.success(m.retrySucceeded(code));
    else if (done.status === "failed" || done.attempts > 0)
      message.warning(m.retryStillFailing(code, done.lastError ?? ""), 8);
    else message.info(m.retryInProgress(code));
    reload();
  }

  const summary = data?.summary ?? { failed: 0, pending: 0 };

  return (
    <Card size="small">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented<ErpJobFilter>
          value={filter}
          onChange={(value) => reload(value)}
          options={[
            { value: "failed", label: m.filters.failed(summary.failed) },
            { value: "pending", label: m.filters.pending(summary.pending) },
            { value: "all", label: m.filters.all },
          ]}
        />
        <Button onClick={() => reload()} loading={loading}>
          {m.refresh}
        </Button>
      </div>

      <Table<ErpJobRow>
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={data?.items ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 960 }}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty[filter]} />
          ),
        }}
        columns={[
          {
            title: m.columns.kind,
            dataIndex: "kind",
            width: 140,
            render: (kind: string) => m.kinds[kind] ?? kind,
          },
          {
            title: m.columns.resource,
            key: "resource",
            width: 160,
            render: (_: unknown, row) =>
              row.resource.type === "customer" ? (
                <Link href={ROUTES.customerDetail(row.resource.id)}>{row.resource.code}</Link>
              ) : (
                row.resource.code
              ),
          },
          {
            title: m.columns.name,
            key: "name",
            width: 180,
            ellipsis: true,
            render: (_: unknown, row) => row.resource.name,
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 130,
            render: (status: ErpJobRow["status"], row) => {
              const tag = (
                <Tag color={status === "failed" ? "red" : "processing"}>
                  {m.status[status] ?? status}
                </Tag>
              );
              return status === "pending" ? (
                <Tooltip title={m.nextTry(when(row.runAfter))}>{tag}</Tooltip>
              ) : (
                tag
              );
            },
          },
          {
            title: m.columns.attempts,
            dataIndex: "attempts",
            width: 90,
            align: "right" as const,
            render: (n: number) => m.attempts(n),
          },
          {
            title: m.columns.lastError,
            dataIndex: "lastError",
            render: (error: string | null) =>
              error ? (
                <Paragraph
                  className="mb-0! text-xs"
                  type="danger"
                  ellipsis={{ rows: 2, expandable: true, symbol: m.more }}
                  copyable={{ text: error }}
                >
                  {error}
                </Paragraph>
              ) : (
                <Text type="secondary">{m.noError}</Text>
              ),
          },
          {
            title: m.columns.when,
            dataIndex: "updatedAt",
            width: 130,
            render: (at: string) => when(at),
          },
          {
            title: "",
            key: "actions",
            width: 100,
            fixed: "right" as const,
            render: (_: unknown, row) => (
              <Popconfirm
                title={m.retryConfirm}
                okText={m.retry}
                cancelText={m.cancel}
                onConfirm={() => void retry(row)}
              >
                <Button
                  size="small"
                  type={row.status === "failed" ? "primary" : "default"}
                  loading={retrying === row.id}
                >
                  {m.retry}
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </Card>
  );
}

/**
 * CD-27 — รายการสินค้าจาก SAP: มีกี่รายการ ดึงล่าสุดเมื่อไร และปุ่มดึงตอนนี้
 * (เช่น หลังเพิ่มสินค้าใหม่ใน SAP แล้วไม่อยากรอรอบรายชั่วโมง).
 */
export function ProductCatalogCard() {
  const { message } = App.useApp();
  const mc = m.catalog;
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(
    () =>
      getCatalogStatus().then((result) => {
        if (result.ok) setStatus(result.data);
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function syncNow() {
    setSyncing(true);
    const result = await syncCatalog();
    setSyncing(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(mc.synced(result.data));
    void load();
  }

  return (
    <Card size="small" title={mc.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {status && status.lastSyncedAt ? (
            <>
              <Text>{mc.counts(status.active, status.total)}</Text>
              <Text type="secondary" className="ml-2 text-xs">
                {mc.lastSynced(when(status.lastSyncedAt))}
              </Text>
            </>
          ) : (
            <Text type="warning">{mc.never}</Text>
          )}
          <Text type="secondary" className="block text-xs">
            {mc.hint}
          </Text>
        </div>
        <Button onClick={() => void syncNow()} loading={syncing}>
          {mc.syncNow}
        </Button>
      </div>
    </Card>
  );
}
