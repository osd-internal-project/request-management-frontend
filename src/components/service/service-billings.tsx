"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, Select, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { ServiceBilling } from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ErpBillingState } from "./service-billing-card";

const m = messages.service.assets.billing;

/** CD-242 — every billed job's charge and where it stands in SAP. */
export function ServiceBillings() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [erpStatus, setErpStatus] = useState<string | undefined>(undefined);
  const key = `${status ?? ""}|${erpStatus ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: ServiceBilling[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const [s, e] = key.split("|");
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (e) params.set("erp_status", e);
    void appApi<ServiceBilling[]>(`service-billings?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, rows: result.data, error: null }
            : { key, rows: [], error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const rows = loaded?.key === key ? loaded.rows : [];

  return (
    <Card title={m.listTitle}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      <Space wrap className="mb-3">
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder={m.filterStatus}
          value={status}
          onChange={setStatus}
          options={Object.entries(m.status).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder={m.filterErp}
          value={erpStatus}
          onChange={setErpStatus}
          options={Object.entries(m.erpStatus).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Space>
      {loaded?.key === key && loaded.error && (
        <Alert className="mb-2" type="error" showIcon title={loaded.error} />
      )}
      <Table<ServiceBilling>
        rowKey="id"
        size="small"
        loading={!loaded || loaded.key !== key}
        dataSource={rows}
        pagination={rows.length > 20 ? { pageSize: 20 } : false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 1000 }}
        columns={[
          {
            title: m.columns.reference,
            dataIndex: "reference",
            width: 200,
          },
          {
            title: m.columns.request,
            render: (_: unknown, row) => (
              <Link href={ROUTES.requestDetail(row.requestId)}>
                {[row.request?.requestNo, row.request?.subject]
                  .filter(Boolean)
                  .join(" · ")}
              </Link>
            ),
          },
          {
            title: m.columns.customer,
            width: 200,
            render: (_: unknown, row) =>
              row.customer ? `${row.customer.code} · ${row.customer.name}` : "",
          },
          {
            title: m.columns.total,
            dataIndex: "netTotal",
            width: 120,
            align: "right",
            render: (value: number) =>
              value.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
          },
          {
            title: m.columns.status,
            width: 110,
            render: (_: unknown, row) => <Tag>{m.status[row.status]}</Tag>,
          },
          {
            title: m.columns.erp,
            width: 260,
            render: (_: unknown, row) => <ErpBillingState billing={row} />,
          },
        ]}
      />
    </Card>
  );
}
