"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { VendorCost } from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";

const m = messages.pricing.vendorCosts;

interface ListResponse {
  maxAgeDays: number;
  syncedAt: string | null;
  items: VendorCost[];
}

/** CD-206 — suppliers' costs synced from SAP, newest first, old ones flagged. */
export function VendorCostList({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const key = `${q}|${staleOnly}|${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    data: ListResponse | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const [text, stale] = key.split("|");
    const params = new URLSearchParams();
    if (text) params.set("q", text);
    if (stale === "true") params.set("stale", "true");
    void appApi<ListResponse>(`pricing/vendor-costs?${params.toString()}`).then(
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

  async function sync() {
    setBusy(true);
    const result = await appApi<{ total: number }>(
      "pricing/vendor-costs/sync",
      {
        method: "POST",
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.synced(result.data.total));
    setReload(reload + 1);
  }

  const data = loaded?.key === key ? loaded.data : null;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            {m.title}
          </Title>
          <Text type="secondary">{m.hint(data?.maxAgeDays ?? 90)}</Text>
          <Text type="secondary" className="block text-xs">
            {data?.syncedAt
              ? m.syncedAt(dayjs(data.syncedAt).format("DD/MM/YYYY HH:mm"))
              : m.neverSynced}
          </Text>
        </div>
        {canManage && (
          <Button loading={busy} onClick={() => void sync()}>
            {m.sync}
          </Button>
        )}
      </div>
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-72 max-w-full"
            placeholder={m.search}
            onSearch={(value) => setQ(value.trim())}
          />
          <Checkbox
            checked={staleOnly}
            onChange={(event) => setStaleOnly(event.target.checked)}
          >
            {m.staleOnly}
          </Checkbox>
        </div>
        {loaded?.key === key && loaded.error ? (
          <Alert type="error" showIcon title={loaded.error} />
        ) : !data ? (
          <Skeleton active />
        ) : (
          <Table<VendorCost>
            rowKey={(row) =>
              `${row.productCode}|${row.vendorCode}|${row.source}`
            }
            size="small"
            dataSource={data.items}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            locale={{ emptyText: m.empty }}
            scroll={{ x: 900 }}
            columns={[
              { title: m.product, dataIndex: "productCode", width: 140 },
              {
                title: m.vendor,
                key: "vendor",
                render: (_: unknown, row) => (
                  <>
                    <div>{row.vendorName ?? row.vendorCode}</div>
                    <Text type="secondary" className="text-xs">
                      {row.vendorCode}
                    </Text>
                  </>
                ),
              },
              {
                title: m.source,
                key: "source",
                width: 160,
                render: (_: unknown, row) =>
                  `${m.sources[row.source] ?? row.source}${row.docNo ? ` ${row.docNo}` : ""}`,
              },
              {
                title: m.cost,
                dataIndex: "unitCost",
                width: 130,
                align: "right",
                render: (value: number | undefined, row) =>
                  value === undefined
                    ? "—"
                    : `${value.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ${row.currency}`,
              },
              {
                title: m.date,
                dataIndex: "costDate",
                width: 120,
                render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
              },
              {
                title: m.age,
                dataIndex: "ageDays",
                width: 110,
                align: "right",
                render: (value: number, row) =>
                  row.stale ? (
                    <Tag color="orange">
                      {value} · {m.stale}
                    </Tag>
                  ) : (
                    value
                  ),
              },
              {
                title: m.validTo,
                dataIndex: "validTo",
                width: 110,
                render: (value: string | null) =>
                  value ? dayjs(value).format("DD/MM/YYYY") : "—",
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
