"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  Entitlement,
  EntitlementDetail,
  EntitlementListRow,
  ServiceAssetList,
} from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { PmPlanCard } from "./pm-plan";

const m = messages.service.assets.entitlements;

export const stateColor: Record<string, string> = {
  active: "success",
  upcoming: "processing",
  expired: "default",
  cancelled: "error",
};

interface Editing {
  id: string | null;
  customerId: string | null;
  customerLabel: string | null;
  contractId: string | null;
  kind: string;
  title: string;
  range: [Dayjs, Dayjs] | null;
  coverage: string | null;
  severityTargets: Entitlement["severityTargets"];
  correctiveQuota: number | null;
  preventiveQuota: number | null;
  assetIds: string[];
  note: string;
  reason: string;
}

/** One entitlement's level, period and quotas — for a drawer or a card. */
export function EntitlementFacts({ row }: { readonly row: Entitlement }) {
  return (
    <div className="text-xs">
      <div>
        <Tag color={stateColor[row.state]}>{m.states[row.state]}</Tag>
        <Tag>{m.kinds[row.kind]}</Tag>
        {row.coverage && <Tag color="blue">{m.coverage[row.coverage]}</Tag>}
        {dayjs(row.startOn).format("D MMM YY")} –{" "}
        {dayjs(row.endOn).format("D MMM YY")}
      </div>
      {row.severityTargets && (
        <div className="mt-1">
          {Object.entries(row.severityTargets).map(([level, target]) => (
            <div key={level}>
              {m.severity[level] ?? level}:{" "}
              {m.targets(target.responseHours, target.resolutionHours)}
            </div>
          ))}
        </div>
      )}
      <div className="mt-1">
        {m.corrective} {m.quota(row.correctiveLeft, row.correctiveQuota)} ·{" "}
        {m.preventive} {m.quota(row.preventiveLeft, row.preventiveQuota)}
      </div>
    </div>
  );
}

/**
 * CD-237 — warranties and service contracts: listed by state (or soon to
 * end), opened with what they cover, set from a contract by the service team.
 * With `customerId`, one customer's.
 */
export function Entitlements({
  canManage,
  customerId,
  people = [],
}: {
  readonly canManage: boolean;
  readonly customerId?: string;
  /** CD-244 — who may own a PM plan; empty = the plan is read-only. */
  readonly people?: readonly { id: string; name: string }[];
}) {
  const { message } = App.useApp();
  const [state, setState] = useState("active");
  const [expiring, setExpiring] = useState(false);
  const [reload, setReload] = useState(0);
  const key = `${state}|${expiring ? 60 : 0}|${customerId ?? ""}|${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: EntitlementListRow[];
    error: string | null;
  } | null>(null);
  const [detail, setDetail] = useState<EntitlementDetail | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [customers, setCustomers] = useState<
    { value: string; label: string }[]
  >([]);
  const [contracts, setContracts] = useState<
    { value: string; label: string }[]
  >([]);
  const [assetOptions, setAssetOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const [s, days, customer] = key.split("|");
    const params = new URLSearchParams({ state: s });
    if (days !== "0") params.set("expiring_days", days);
    if (customer) params.set("customer_id", customer);
    void appApi<EntitlementListRow[]>(`service-entitlements?${params}`).then(
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

  async function open(id: string) {
    const result = await appApi<EntitlementDetail>(
      `service-entitlements/${id}`,
    );
    if (result.ok) setDetail(result.data);
    else message.error(result.message);
  }

  async function loadCustomer(id: string) {
    const [contractRows, assets] = await Promise.all([
      appApi<{ id: string; contractNo: string; title: string }[]>(
        `service-entitlements/contracts?customer_id=${encodeURIComponent(id)}`,
      ),
      appApi<ServiceAssetList>(
        `service-assets?customer_id=${encodeURIComponent(id)}&status=active`,
      ),
    ]);
    setContracts(
      contractRows.ok
        ? contractRows.data.map((row) => ({
            value: row.id,
            label: `${row.contractNo} · ${row.title}`,
          }))
        : [],
    );
    setAssetOptions(
      assets.ok
        ? assets.data.items.map((row) => ({
            value: row.id,
            label: [row.name, row.serialNo, row.location]
              .filter(Boolean)
              .join(" · "),
          }))
        : [],
    );
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

  async function pickContract(contractId: string) {
    if (!editing) return;
    const result = await appApi<{
      title: string;
      startOn: string | null;
      endOn: string;
      coverage: string | null;
      severityTargets: Entitlement["severityTargets"];
    }>(`service-entitlements/contract-defaults/${contractId}`);
    if (!result.ok) {
      setEditing({ ...editing, contractId });
      return;
    }
    setEditing({
      ...editing,
      contractId,
      title: editing.title || result.data.title,
      range: [
        dayjs(result.data.startOn ?? undefined),
        dayjs(result.data.endOn),
      ],
      coverage: result.data.coverage,
      severityTargets: result.data.severityTargets,
    });
  }

  async function startEdit(row: EntitlementDetail | null) {
    setError(null);
    const customer = row?.customer?.id ?? customerId ?? null;
    if (customer) await loadCustomer(customer);
    setEditing({
      id: row?.id ?? null,
      customerId: customer,
      customerLabel: row?.customer
        ? `${row.customer.code} · ${row.customer.name}`
        : null,
      contractId: row?.contract?.id ?? null,
      kind: row?.kind ?? "service_contract",
      title: row?.title ?? "",
      range: row ? [dayjs(row.startOn), dayjs(row.endOn)] : null,
      coverage: row?.coverage ?? null,
      severityTargets: row?.severityTargets ?? null,
      correctiveQuota: row?.correctiveQuota ?? null,
      preventiveQuota: row?.preventiveQuota ?? null,
      assetIds: row?.assets.map((asset) => asset.id) ?? [],
      note: row?.note ?? "",
      reason: "",
    });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const body = {
      kind: editing.kind,
      customer_id: editing.customerId ?? "",
      contract_id: editing.contractId ?? "",
      title: editing.title,
      start_on: editing.range?.[0].format("YYYY-MM-DD") ?? "",
      end_on: editing.range?.[1].format("YYYY-MM-DD") ?? "",
      coverage: editing.coverage ?? "",
      severity_targets: editing.severityTargets,
      corrective_quota: editing.correctiveQuota,
      preventive_quota: editing.preventiveQuota,
      asset_ids: editing.assetIds,
      note: editing.note,
      ...(editing.id ? { reason: editing.reason } : {}),
    };
    const result = await appApi<EntitlementDetail>(
      editing.id
        ? `service-entitlements/${editing.id}`
        : "service-entitlements",
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

  async function cancel() {
    if (!detail || cancelling === null) return;
    setBusy(true);
    setError(null);
    const result = await appApi<EntitlementDetail>(
      `service-entitlements/${detail.id}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelling }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setCancelling(null);
    setDetail(result.data);
    setReload((n) => n + 1);
  }

  const rows = loaded?.key === key ? loaded.rows : [];

  const body = (
    <>
      <Space wrap className="mb-3">
        <Select
          value={state}
          style={{ width: 150 }}
          options={["active", "upcoming", "expired", "cancelled", "all"].map(
            (value) => ({ value, label: m.states[value] }),
          )}
          onChange={setState}
        />
        <Checkbox
          checked={expiring}
          onChange={(event) => setExpiring(event.target.checked)}
        >
          {m.expiring}
        </Checkbox>
        {canManage && (
          <Button type="primary" onClick={() => void startEdit(null)}>
            {m.add}
          </Button>
        )}
      </Space>
      {loaded?.key === key && loaded.error && (
        <Alert className="mb-2" type="error" showIcon title={loaded.error} />
      )}
      <Table<EntitlementListRow>
        rowKey="id"
        size="small"
        loading={!loaded || loaded.key !== key}
        dataSource={rows}
        pagination={rows.length > 20 ? { pageSize: 20 } : false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 900 }}
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
                  render: (_: unknown, row: EntitlementListRow) =>
                    row.customer
                      ? `${row.customer.code} · ${row.customer.name}`
                      : "",
                },
              ]),
          {
            title: m.columns.title,
            render: (_: unknown, row) => (
              <span>
                <Tag>{m.kinds[row.kind]}</Tag>
                {row.title}
                <Text type="secondary" className="block text-xs">
                  {m.assets(row.assetCount)}
                </Text>
              </span>
            ),
          },
          {
            title: m.columns.period,
            width: 170,
            render: (_: unknown, row) =>
              `${dayjs(row.startOn).format("DD/MM/YY")} – ${dayjs(row.endOn).format("DD/MM/YY")}`,
          },
          {
            title: m.columns.coverage,
            width: 120,
            render: (_: unknown, row) =>
              row.coverage ? m.coverage[row.coverage] : "",
          },
          {
            title: m.columns.quota,
            width: 180,
            render: (_: unknown, row) => (
              <span className="text-xs">
                {m.corrective}{" "}
                {m.quota(row.correctiveLeft, row.correctiveQuota)}
                <br />
                {m.preventive}{" "}
                {m.quota(row.preventiveLeft, row.preventiveQuota)}
              </span>
            ),
          },
          {
            title: m.columns.state,
            dataIndex: "state",
            width: 100,
            render: (value: string) => (
              <Tag color={stateColor[value]}>{m.states[value]}</Tag>
            ),
          },
        ]}
      />
    </>
  );

  return (
    <>
      {customerId ? (
        body
      ) : (
        <Card title={m.title}>
          <Text type="secondary" className="mb-3 block text-xs">
            {m.hint}
          </Text>
          {body}
        </Card>
      )}

      <Drawer
        open={detail !== null}
        width={560}
        title={detail?.title}
        onClose={() => setDetail(null)}
        extra={
          detail &&
          canManage &&
          detail.state !== "cancelled" && (
            <Space>
              <Button size="small" onClick={() => void startEdit(detail)}>
                {m.edit}
              </Button>
              <Button
                size="small"
                danger
                onClick={() => {
                  setError(null);
                  setCancelling("");
                }}
              >
                {m.cancel}
              </Button>
            </Space>
          )
        }
      >
        {detail && (
          <>
            <EntitlementFacts row={detail} />
            <Descriptions size="small" column={1} bordered className="mt-3">
              <Descriptions.Item label={m.form.customer}>
                {detail.customer
                  ? `${detail.customer.code} · ${detail.customer.name}`
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label={m.form.contract}>
                {detail.contract
                  ? `${detail.contract.contractNo} · ${detail.contract.title}`
                  : "-"}
              </Descriptions.Item>
              {detail.note && (
                <Descriptions.Item label={m.form.note}>
                  {detail.note}
                </Descriptions.Item>
              )}
              {detail.cancelReason && (
                <Descriptions.Item label={m.form.cancelReason}>
                  {detail.cancelReason}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Text strong className="mt-4 mb-1 block">
              {m.form.assets}
            </Text>
            {detail.assets.map((asset) => (
              <div key={asset.id} className="text-sm">
                {asset.name}
                <Text type="secondary" className="text-xs">
                  {" "}
                  {[asset.model, asset.serialNo, asset.location]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
            ))}
            {/* CD-244 — a service contract's PM plan */}
            {detail.kind === "service_contract" && (
              <PmPlanCard
                entitlementId={detail.id}
                canManage={canManage && detail.state !== "cancelled"}
                people={people}
              />
            )}
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
        width={640}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            {!customerId && !editing.id && (
              <label className="block text-xs">
                {m.form.customer}
                <Select
                  className="w-full"
                  showSearch={{
                    filterOption: false,
                    onSearch: (text) => void searchCustomers(text),
                  }}
                  value={editing.customerId ?? undefined}
                  options={customers}
                  onChange={(value: string) => {
                    setEditing({
                      ...editing,
                      customerId: value,
                      contractId: null,
                      assetIds: [],
                    });
                    void loadCustomer(value);
                  }}
                />
              </label>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.contract}
                <Select
                  className="w-full"
                  allowClear
                  value={editing.contractId ?? undefined}
                  options={contracts}
                  onChange={(value?: string) =>
                    value
                      ? void pickContract(value)
                      : setEditing({ ...editing, contractId: null })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.kind}
                <Select
                  className="w-full"
                  value={editing.kind}
                  options={["service_contract", "warranty"].map((value) => ({
                    value,
                    label: m.kinds[value],
                  }))}
                  onChange={(value: string) =>
                    setEditing({ ...editing, kind: value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.title}
              <Input
                value={editing.title}
                maxLength={255}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
              <label className="block text-xs">
                {m.form.period}
                <DatePicker.RangePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={editing.range}
                  onChange={(value) =>
                    setEditing({
                      ...editing,
                      range:
                        value?.[0] && value[1] ? [value[0], value[1]] : null,
                    })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.coverage}
                <Select
                  className="w-full"
                  allowClear
                  value={editing.coverage ?? undefined}
                  options={Object.entries(m.coverage).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(value?: string) =>
                    setEditing({ ...editing, coverage: value ?? null })
                  }
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.correctiveQuota}
                <InputNumber
                  className="w-full"
                  min={0}
                  max={1000}
                  value={editing.correctiveQuota}
                  onChange={(value) =>
                    setEditing({ ...editing, correctiveQuota: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.preventiveQuota}
                <InputNumber
                  className="w-full"
                  min={0}
                  max={1000}
                  value={editing.preventiveQuota}
                  onChange={(value) =>
                    setEditing({ ...editing, preventiveQuota: value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.assets}
              <Select
                className="w-full"
                mode="multiple"
                showSearch={{ optionFilterProp: "label" }}
                value={editing.assetIds}
                options={assetOptions}
                onChange={(value: string[]) =>
                  setEditing({ ...editing, assetIds: value })
                }
              />
            </label>
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
        open={cancelling !== null}
        title={m.cancel}
        onCancel={() => setCancelling(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        okButtonProps={{ danger: true }}
        confirmLoading={busy}
        onOk={() => void cancel()}
        destroyOnHidden
      >
        {error && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        <label className="block text-xs">
          {m.form.cancelReason}
          <Input
            value={cancelling ?? ""}
            maxLength={1000}
            onChange={(event) => setCancelling(event.target.value)}
          />
        </label>
      </Modal>
    </>
  );
}
