"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ServiceAssetDetail,
  ServiceAssetList,
  ServiceAssetRow,
} from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { EntitlementFacts } from "./entitlements";

const m = messages.service.assets;

const statusColor: Record<string, string> = {
  active: "success",
  replaced: "default",
  removed: "error",
};

interface Editing {
  id: string | null;
  kind: string;
  customerId: string | null;
  customerLabel: string | null;
  name: string;
  productCode: string;
  model: string;
  serialNo: string;
  location: string;
  version: string;
  installedOn: Dayjs | null;
  note: string;
  reason: string;
}

/**
 * CD-236 — the installed base: searched by serial, customer, place or
 * model; detail with its history; added, corrected and retired by the
 * service team. With `customerId`, one customer's (the 360° tab).
 */
export function AssetRegister({
  canManage,
  customerId,
}: {
  readonly canManage: boolean;
  readonly customerId?: string;
}) {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [reload, setReload] = useState(0);
  const key = `${q}|${status}|${customerId ?? ""}|${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    data: ServiceAssetList | null;
    error: string | null;
  } | null>(null);
  const [detail, setDetail] = useState<ServiceAssetDetail | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [statusing, setStatusing] = useState<{
    status: string;
    reason: string;
  } | null>(null);
  const [customers, setCustomers] = useState<
    { value: string; label: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const [text, state, customer] = key.split("|");
    const params = new URLSearchParams({ status: state });
    if (text.trim()) params.set("q", text.trim());
    if (customer) params.set("customer_id", customer);
    const timer = setTimeout(() => {
      void appApi<ServiceAssetList>(`service-assets?${params}`).then(
        (result) => {
          if (!live) return;
          setLoaded(
            result.ok
              ? { key, data: result.data, error: null }
              : { key, data: null, error: result.message },
          );
        },
      );
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key]);

  async function open(id: string) {
    const result = await appApi<ServiceAssetDetail>(`service-assets/${id}`);
    if (result.ok) setDetail(result.data);
    else message.error(result.message);
  }

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

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const body = {
      kind: editing.kind,
      customer_id: editing.customerId ?? "",
      name: editing.name,
      product_code: editing.productCode,
      model: editing.model,
      serial_no: editing.serialNo,
      location: editing.location,
      version: editing.version,
      installed_on: editing.installedOn
        ? editing.installedOn.format("YYYY-MM-DD")
        : "",
      note: editing.note,
      ...(editing.id ? { reason: editing.reason } : {}),
    };
    const result = await appApi<ServiceAssetDetail>(
      editing.id ? `service-assets/${editing.id}` : "service-assets",
      {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setEditing(null);
    setDetail(result.data);
    setReload((n) => n + 1);
  }

  async function saveStatus() {
    if (!statusing || !detail) return;
    setBusy(true);
    setError(null);
    const result = await appApi<ServiceAssetDetail>(
      `service-assets/${detail.id}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusing),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setStatusing(null);
    setDetail(result.data);
    setReload((n) => n + 1);
  }

  const startEdit = (row: ServiceAssetRow | null) => {
    setError(null);
    setEditing({
      id: row?.id ?? null,
      kind: row?.kind ?? "equipment",
      customerId: row?.customer?.id ?? customerId ?? null,
      customerLabel: row?.customer
        ? `${row.customer.code} · ${row.customer.name}`
        : null,
      name: row?.name ?? "",
      productCode: row?.productCode ?? "",
      model: row?.model ?? "",
      serialNo: row?.serialNo ?? "",
      location: row?.location ?? "",
      version: row?.version ?? "",
      installedOn: row?.installedOn ? dayjs(row.installedOn) : null,
      note: row?.note ?? "",
      reason: "",
    });
  };

  const data = loaded?.key === key ? loaded.data : null;
  const loading = !loaded || loaded.key !== key;

  const table = (
    <>
      <Space wrap className="mb-3">
        <Input.Search
          allowClear
          placeholder={m.search}
          style={{ width: 320 }}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <Select
          value={status}
          style={{ width: 160 }}
          options={["active", "replaced", "removed", "all"].map((value) => ({
            value,
            label: m.statuses[value],
          }))}
          onChange={setStatus}
        />
        {canManage && (
          <Button type="primary" onClick={() => startEdit(null)}>
            {m.add}
          </Button>
        )}
        {canManage && !customerId && (
          <Link href={ROUTES.serviceAssetImport}>
            <Button>{m.import}</Button>
          </Link>
        )}
      </Space>
      {loaded?.key === key && loaded.error && (
        <Alert className="mb-2" type="error" showIcon title={loaded.error} />
      )}
      {data?.limited && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.limited(data.total)}
        </Text>
      )}
      <Table<ServiceAssetRow>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data?.items ?? []}
        pagination={(data?.items.length ?? 0) > 20 ? { pageSize: 20 } : false}
        locale={{ emptyText: customerId ? m.tabEmpty : m.empty }}
        scroll={{ x: 1000 }}
        onRow={(row) => ({
          onClick: () => void open(row.id),
          className: "cursor-pointer",
        })}
        columns={[
          ...(customerId
            ? []
            : [
                {
                  title: m.columns.customer,
                  width: 200,
                  render: (_: unknown, row: ServiceAssetRow) =>
                    row.customer
                      ? `${row.customer.code} · ${row.customer.name}`
                      : "",
                },
              ]),
          {
            title: m.columns.name,
            render: (_: unknown, row) => (
              <span>
                <Tag>{m.kinds[row.kind]}</Tag>
                {row.name}
                {row.model && (
                  <Text type="secondary" className="block text-xs">
                    {row.model}
                  </Text>
                )}
              </span>
            ),
          },
          {
            title: m.columns.serial,
            dataIndex: "serialNo",
            width: 150,
            render: (value: string | null) => (
              <span className="font-mono text-xs">{value}</span>
            ),
          },
          { title: m.columns.location, dataIndex: "location", width: 150 },
          { title: m.columns.version, dataIndex: "version", width: 90 },
          {
            title: m.columns.installedOn,
            dataIndex: "installedOn",
            width: 100,
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YY") : "",
          },
          {
            title: m.coverageColumn,
            width: 170,
            render: (_: unknown, row: ServiceAssetRow) =>
              row.coverage ? (
                <Tag color="green">
                  {m.coveredUntil(
                    m.entitlements.kinds[row.coverage.kind] ??
                      row.coverage.kind,
                    dayjs(row.coverage.endOn).format("DD/MM/YY"),
                  )}
                </Tag>
              ) : (
                <Tag>{m.notCovered}</Tag>
              ),
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 110,
            render: (value: string) => (
              <Tag color={statusColor[value]}>{m.statuses[value]}</Tag>
            ),
          },
        ]}
      />
    </>
  );

  return (
    <>
      {customerId ? (
        table
      ) : (
        <Card title={m.title}>
          <Text type="secondary" className="mb-3 block text-xs">
            {m.hint}
          </Text>
          {table}
        </Card>
      )}

      <Drawer
        open={detail !== null}
        title={detail ? `${detail.name}` : m.detail}
        width={560}
        onClose={() => setDetail(null)}
        extra={
          detail &&
          canManage && (
            <Space>
              <Button size="small" onClick={() => startEdit(detail)}>
                {m.edit}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setError(null);
                  setStatusing({ status: detail.status, reason: "" });
                }}
              >
                {m.changeStatus}
              </Button>
            </Space>
          )
        }
      >
        {detail && (
          <>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label={m.columns.customer}>
                {detail.customer
                  ? `${detail.customer.code} · ${detail.customer.name}`
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.form.kind}>
                {m.kinds[detail.kind]} · {m.sources[detail.source]}
              </Descriptions.Item>
              <Descriptions.Item label={m.form.productCode}>
                {detail.productCode ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.form.model}>
                {detail.model ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.serial}>
                <span className="font-mono">{detail.serialNo ?? "-"}</span>
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.location}>
                {detail.location ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.version}>
                {detail.version ?? "-"}
                {detail.versionDeployedAt && (
                  <Text type="secondary" className="block text-xs">
                    {m.liveVersion} ·{" "}
                    {dayjs(detail.versionDeployedAt).format("D MMM YY")}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.installedOn}>
                {detail.installedOn ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.acceptedOn}>
                {detail.acceptedOn ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.project}>
                {detail.project ? (
                  <Link href={ROUTES.projectDetail(detail.project.id)}>
                    {detail.project.label}
                  </Link>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.status}>
                <Tag color={statusColor[detail.status]}>
                  {m.statuses[detail.status]}
                </Tag>
              </Descriptions.Item>
              {detail.note && (
                <Descriptions.Item label={m.form.note}>
                  {detail.note}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Text strong className="mt-4 mb-1 block">
              {m.coverageNow}
            </Text>
            {detail.coverage ? (
              <>
                <Text className="block text-sm">{detail.coverage.title}</Text>
                <EntitlementFacts row={detail.coverage} />
              </>
            ) : (
              <Tag>{m.notCovered}</Tag>
            )}
            {detail.entitlements.length > 1 && (
              <>
                <Text strong className="mt-3 mb-1 block text-xs">
                  {m.allEntitlements}
                </Text>
                {detail.entitlements.map((row) => (
                  <div key={row.id} className="mb-1">
                    <Text className="text-xs">{row.title}</Text>
                    <EntitlementFacts row={row} />
                  </div>
                ))}
              </>
            )}
            <Text strong className="mt-4 mb-2 block">
              {m.history}
            </Text>
            <Timeline
              items={detail.history.map((entry) => ({
                children: (
                  <div className="text-xs">
                    <div>
                      {m.actions[entry.action] ?? entry.action} ·{" "}
                      {dayjs(entry.at).format("D MMM YY HH:mm")}
                      {entry.actorName ? ` · ${entry.actorName}` : ""}
                    </div>
                    {entry.reason && (
                      <Text type="secondary" className="text-xs">
                        {entry.reason}
                      </Text>
                    )}
                  </div>
                ),
              }))}
            />
          </>
        )}
      </Drawer>

      <Modal
        open={editing !== null}
        title={editing?.id ? m.edit : m.add}
        onCancel={() => setEditing(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.kind}
                <Select
                  className="w-full"
                  value={editing.kind}
                  options={["equipment", "software"].map((value) => ({
                    value,
                    label: m.kinds[value],
                  }))}
                  onChange={(value: string) =>
                    setEditing({ ...editing, kind: value })
                  }
                />
              </label>
              {!customerId && (
                <label className="block text-xs">
                  {m.form.customer}
                  <Select
                    className="w-full"
                    showSearch={{
                      filterOption: false,
                      onSearch: (text) => void searchCustomers(text),
                    }}
                    value={editing.customerId ?? undefined}
                    options={
                      editing.customerId &&
                      editing.customerLabel &&
                      !customers.some((c) => c.value === editing.customerId)
                        ? [
                            {
                              value: editing.customerId,
                              label: editing.customerLabel,
                            },
                            ...customers,
                          ]
                        : customers
                    }
                    onChange={(value: string, option) =>
                      setEditing({
                        ...editing,
                        customerId: value,
                        customerLabel: Array.isArray(option)
                          ? null
                          : (option?.label as string),
                      })
                    }
                  />
                </label>
              )}
            </div>
            <label className="block text-xs">
              {m.form.name}
              <Input
                value={editing.name}
                maxLength={500}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                {m.form.productCode}
                <Input
                  value={editing.productCode}
                  maxLength={100}
                  onChange={(event) =>
                    setEditing({ ...editing, productCode: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.model}
                <Input
                  value={editing.model}
                  maxLength={200}
                  onChange={(event) =>
                    setEditing({ ...editing, model: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.serial}
                <Input
                  value={editing.serialNo}
                  maxLength={100}
                  onChange={(event) =>
                    setEditing({ ...editing, serialNo: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs sm:col-span-2">
                {m.form.location}
                <Input
                  value={editing.location}
                  maxLength={500}
                  onChange={(event) =>
                    setEditing({ ...editing, location: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.installedOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={editing.installedOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    setEditing({ ...editing, installedOn: value })
                  }
                />
              </label>
            </div>
            {editing.kind === "software" && (
              <label className="block text-xs">
                {m.form.version}
                <Input
                  value={editing.version}
                  maxLength={50}
                  onChange={(event) =>
                    setEditing({ ...editing, version: event.target.value })
                  }
                />
              </label>
            )}
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={editing.note}
                onChange={(event) =>
                  setEditing({ ...editing, note: event.target.value })
                }
              />
            </label>
            {editing.id && (
              <label className="block text-xs">
                {m.form.reason}
                <Input
                  value={editing.reason}
                  maxLength={1000}
                  onChange={(event) =>
                    setEditing({ ...editing, reason: event.target.value })
                  }
                />
              </label>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={statusing !== null}
        title={m.changeStatus}
        onCancel={() => setStatusing(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void saveStatus()}
        destroyOnHidden
      >
        {statusing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.status}
              <Select
                className="w-full"
                value={statusing.status}
                options={["active", "replaced", "removed"].map((value) => ({
                  value,
                  label: m.statuses[value],
                }))}
                onChange={(value: string) =>
                  setStatusing({ ...statusing, status: value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.statusReason}
              <Input
                value={statusing.reason}
                maxLength={1000}
                onChange={(event) =>
                  setStatusing({ ...statusing, reason: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
