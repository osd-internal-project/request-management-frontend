"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import type { VendorCost } from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";

const m = messages.pricing.vendorCosts;
const CURRENCIES = ["THB", "USD", "EUR", "JPY", "SGD", "CNY"];

/** A typed-in cost being added (`id` null) or edited. */
interface Draft {
  id: string | null;
  productCode: string;
  vendorName: string;
  vendorCode: string;
  unitCost: number | null;
  currency: string;
  costDate: string;
  validTo: string | null;
  docNo: string;
}

function emptyDraft(): Draft {
  return {
    id: null,
    productCode: "",
    vendorName: "",
    vendorCode: "",
    unitCost: null,
    currency: "THB",
    costDate: dayjs().format("YYYY-MM-DD"),
    validTo: null,
    docNo: "",
  };
}

interface ListResponse {
  maxAgeDays: number;
  syncedAt: string | null;
  items: VendorCost[];
}

/**
 * CD-206 — suppliers' costs, newest first, old ones flagged: synced from SAP,
 * or typed in here while no ERP is connected. Only typed-in rows are editable.
 */
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

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft || draft.unitCost === null) return;
    setSaving(true);
    const result = await appApi<VendorCost>(
      draft.id ? `pricing/vendor-costs/${draft.id}` : "pricing/vendor-costs",
      {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          product_code: draft.productCode,
          vendor_name: draft.vendorName.trim(),
          vendor_code: draft.vendorCode.trim(),
          unit_cost: draft.unitCost,
          currency: draft.currency,
          cost_date: draft.costDate,
          valid_to: draft.validTo,
          doc_no: draft.docNo.trim() || null,
        }),
      },
    );
    setSaving(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.saved);
    setDraft(null);
    setReload(reload + 1);
  }

  async function remove(id: string) {
    const result = await appApi(`pricing/vendor-costs/${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.removed);
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
          <Space wrap>
            <Button loading={busy} onClick={() => void sync()}>
              {m.sync}
            </Button>
            <Button type="primary" onClick={() => setDraft(emptyDraft())}>
              {m.add}
            </Button>
          </Space>
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
              row.id ?? `${row.productCode}|${row.vendorCode}|${row.source}`
            }
            size="small"
            dataSource={data.items}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            locale={{ emptyText: m.empty }}
            scroll={{ x: canManage ? 1040 : 900 }}
            columns={[
              { title: m.product, dataIndex: "productCode", width: 140 },
              {
                title: m.vendor,
                key: "vendor",
                render: (_: unknown, row) => (
                  <>
                    <div>{row.vendorName ?? row.vendorCode}</div>
                    {row.vendorName !== row.vendorCode && (
                      <Text type="secondary" className="text-xs">
                        {row.vendorCode}
                      </Text>
                    )}
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
              ...(canManage
                ? [
                    {
                      title: "",
                      key: "actions",
                      width: 140,
                      render: (_: unknown, row: VendorCost) => {
                        const id = row.id;
                        if (row.source !== "manual" || !id) return null;
                        return (
                          <Space size={0}>
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                setDraft({
                                  id,
                                  productCode: row.productCode,
                                  vendorName: row.vendorName ?? "",
                                  vendorCode:
                                    row.vendorCode === row.vendorName
                                      ? ""
                                      : row.vendorCode,
                                  unitCost: row.unitCost ?? null,
                                  currency: row.currency,
                                  costDate: row.costDate,
                                  validTo: row.validTo,
                                  docNo: row.docNo ?? "",
                                })
                              }
                            >
                              {m.edit}
                            </Button>
                            <Popconfirm
                              title={m.removeConfirm}
                              okText={m.remove}
                              onConfirm={() => void remove(id)}
                            >
                              <Button type="link" size="small" danger>
                                {m.remove}
                              </Button>
                            </Popconfirm>
                          </Space>
                        );
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      </Card>

      <Modal
        open={!!draft}
        title={draft?.id ? m.editTitle : m.addTitle}
        okText={m.save}
        okButtonProps={{
          loading: saving,
          disabled:
            !draft?.productCode ||
            !draft.vendorName.trim() ||
            draft.unitCost === null ||
            !draft.costDate,
        }}
        onOk={() => void save()}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        {draft && (
          <Space orientation="vertical" className="w-full">
            <div>
              <Text type="secondary">{m.product}</Text>
              {draft.id ? (
                <div>
                  <Text strong>{draft.productCode}</Text>
                </div>
              ) : (
                <ProductPicker
                  canAdd={canManage}
                  value={draft.productCode}
                  onPick={(product) =>
                    setDraft({ ...draft, productCode: product.code })
                  }
                  onClear={() => setDraft({ ...draft, productCode: "" })}
                />
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
              <div>
                <Text type="secondary">{m.vendorName}</Text>
                <Input
                  maxLength={200}
                  value={draft.vendorName}
                  onChange={(event) =>
                    setDraft({ ...draft, vendorName: event.target.value })
                  }
                />
              </div>
              <div>
                <Text type="secondary">{m.vendorCode}</Text>
                <Input
                  maxLength={100}
                  value={draft.vendorCode}
                  onChange={(event) =>
                    setDraft({ ...draft, vendorCode: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
              <div>
                <Text type="secondary">{m.currency}</Text>
                <Select
                  className="w-full"
                  value={draft.currency}
                  onChange={(currency: string) =>
                    setDraft({ ...draft, currency })
                  }
                  options={CURRENCIES.map((value) => ({ value, label: value }))}
                />
              </div>
              <div>
                <Text type="secondary">{m.cost}</Text>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={2}
                  value={draft.unitCost}
                  onChange={(unitCost) => setDraft({ ...draft, unitCost })}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Text type="secondary">{m.date}</Text>
                <DatePicker
                  className="w-full"
                  allowClear={false}
                  disabledDate={(date) => date.isAfter(dayjs(), "day")}
                  value={draft.costDate ? dayjs(draft.costDate) : null}
                  onChange={(date) =>
                    setDraft({
                      ...draft,
                      costDate: date ? date.format("YYYY-MM-DD") : "",
                    })
                  }
                />
                <Text type="secondary" className="text-xs">
                  {m.dateHint}
                </Text>
              </div>
              <div>
                <Text type="secondary">{m.validTo}</Text>
                <DatePicker
                  className="w-full"
                  placeholder={m.noEnd}
                  value={draft.validTo ? dayjs(draft.validTo) : null}
                  onChange={(date) =>
                    setDraft({
                      ...draft,
                      validTo: date ? date.format("YYYY-MM-DD") : null,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Text type="secondary">{m.docNo}</Text>
              <Input
                maxLength={100}
                value={draft.docNo}
                onChange={(event) =>
                  setDraft({ ...draft, docNo: event.target.value })
                }
              />
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
