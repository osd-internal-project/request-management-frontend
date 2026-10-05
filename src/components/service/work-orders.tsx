"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { ServiceAssetList, WorkOrder } from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.workOrders;
const SEVERITIES = ["critical", "high", "medium", "low"];
const severityLabel = messages.service.assets.entitlements.severity;

interface Opening {
  customerId: string | null;
  assetId: string | null;
  kind: string;
  severity: string;
  subject: string;
  detail: string;
}

/**
 * CD-239 — the service jobs still open (or all), and a new one opened for a
 * customer's asset. `start` pre-fills the form (from the asset register).
 */
export function WorkOrders({
  canManage,
  start,
}: {
  readonly canManage: boolean;
  readonly start?: {
    customerId: string;
    customerLabel: string;
    assetId?: string;
  };
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [all, setAll] = useState(false);
  const [reload, setReload] = useState(0);
  const key = `${all}|${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: WorkOrder[];
    error: string | null;
  } | null>(null);
  const [opening, setOpening] = useState<Opening | null>(
    start && canManage
      ? {
          customerId: start.customerId,
          assetId: start.assetId ?? null,
          kind: "corrective",
          severity: "medium",
          subject: "",
          detail: "",
        }
      : null,
  );
  const [customers, setCustomers] = useState<
    { value: string; label: string }[]
  >(start ? [{ value: start.customerId, label: start.customerLabel }] : []);
  const [assets, setAssets] = useState<{ value: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const [everything] = key.split("|");
    void appApi<WorkOrder[]>(
      `service-work-orders?state=${everything === "true" ? "all" : "open"}`,
    ).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { key, rows: result.data, error: null }
          : { key, rows: [], error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [key]);

  const customerOfOpening = opening?.customerId ?? null;
  useEffect(() => {
    if (!customerOfOpening) return;
    let live = true;
    void appApi<ServiceAssetList>(
      `service-assets?customer_id=${encodeURIComponent(customerOfOpening)}&status=active`,
    ).then((result) => {
      if (!live || !result.ok) return;
      setAssets(
        result.data.items.map((row) => ({
          value: row.id,
          label: [row.name, row.serialNo, row.location]
            .filter(Boolean)
            .join(" · "),
        })),
      );
    });
    return () => {
      live = false;
    };
  }, [customerOfOpening]);

  async function searchCustomers(text: string) {
    if (text.trim().length < 2) return;
    const result = await appApi<{
      data: { id: string; customerCode: string; nameTh: string }[];
    }>(`customers?search=${encodeURIComponent(text.trim())}&page_size=20`);
    if (result.ok) {
      setCustomers(
        result.data.data.map((row) => ({
          value: row.id,
          label: `${row.customerCode} · ${row.nameTh}`,
        })),
      );
    }
  }

  async function open() {
    if (!opening) return;
    setBusy(true);
    setError(null);
    const result = await appApi<WorkOrder>("service-work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: opening.customerId ?? "",
        ...(opening.assetId ? { asset_id: opening.assetId } : {}),
        work_kind: opening.kind,
        severity: opening.severity,
        subject: opening.subject,
        detail: opening.detail,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setOpening(null);
    setReload((n) => n + 1);
    router.push(ROUTES.requestDetail(result.data.requestId));
  }

  const rows = loaded?.key === key ? loaded.rows : [];

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      <Space wrap className="mb-3">
        <Checkbox checked={all} onChange={(e) => setAll(e.target.checked)}>
          {m.showAll}
        </Checkbox>
        {canManage && (
          <Button
            type="primary"
            onClick={() => {
              setError(null);
              setOpening({
                customerId: null,
                assetId: null,
                kind: "corrective",
                severity: "medium",
                subject: "",
                detail: "",
              });
            }}
          >
            {m.open}
          </Button>
        )}
      </Space>
      {loaded?.key === key && loaded.error && (
        <Alert className="mb-2" type="error" showIcon title={loaded.error} />
      )}
      <Table<WorkOrder>
        rowKey="id"
        size="small"
        loading={!loaded || loaded.key !== key}
        dataSource={rows}
        pagination={rows.length > 20 ? { pageSize: 20 } : false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 1000 }}
        columns={[
          {
            title: m.columns.request,
            width: 160,
            render: (_: unknown, row) => (
              <Link href={ROUTES.requestDetail(row.requestId)}>
                {row.request?.requestNo ?? row.requestId.slice(0, 8)}
              </Link>
            ),
          },
          {
            title: m.columns.subject,
            render: (_: unknown, row) => row.request?.subject ?? "",
          },
          {
            title: m.columns.customer,
            width: 200,
            render: (_: unknown, row) =>
              row.customer ? `${row.customer.code} · ${row.customer.name}` : "",
          },
          {
            title: m.columns.asset,
            width: 180,
            render: (_: unknown, row) =>
              row.asset
                ? [row.asset.name, row.asset.serialNo]
                    .filter(Boolean)
                    .join(" · ")
                : "",
          },
          {
            title: m.columns.kind,
            dataIndex: "workKind",
            width: 100,
            render: (value: string) => m.kinds[value],
          },
          {
            title: m.columns.billing,
            width: 150,
            render: (_: unknown, row) =>
              row.billing ? (
                <Tag color={row.billing === "billable" ? "orange" : "green"}>
                  {m.billing[row.billing]}
                </Tag>
              ) : (
                <Tag>{m.notDecided}</Tag>
              ),
          },
          {
            title: m.columns.status,
            width: 120,
            render: (_: unknown, row) =>
              row.request
                ? ((messages.myWork.status as Record<string, string>)[
                    row.request.status
                  ] ?? row.request.status)
                : "",
          },
        ]}
      />

      <Modal
        open={opening !== null}
        title={m.openFor}
        onCancel={() => setOpening(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void open()}
        destroyOnHidden
      >
        {opening && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.customer}
              <Select
                className="w-full"
                showSearch={{
                  filterOption: false,
                  onSearch: (text) => void searchCustomers(text),
                }}
                value={opening.customerId ?? undefined}
                options={customers}
                onChange={(value: string) =>
                  setOpening({ ...opening, customerId: value, assetId: null })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.asset}
              <Select
                className="w-full"
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                value={opening.assetId ?? undefined}
                options={assets}
                onChange={(value?: string) =>
                  setOpening({ ...opening, assetId: value ?? null })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.kind}
                <Select
                  className="w-full"
                  value={opening.kind}
                  options={Object.entries(m.kinds).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(value: string) =>
                    setOpening({ ...opening, kind: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.severity}
                <Select
                  className="w-full"
                  value={opening.severity}
                  options={SEVERITIES.map((value) => ({
                    value,
                    label: severityLabel[value],
                  }))}
                  onChange={(value: string) =>
                    setOpening({ ...opening, severity: value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.subject}
              <Input
                value={opening.subject}
                maxLength={255}
                onChange={(event) =>
                  setOpening({ ...opening, subject: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.detail}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={opening.detail}
                onChange={(event) =>
                  setOpening({ ...opening, detail: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
