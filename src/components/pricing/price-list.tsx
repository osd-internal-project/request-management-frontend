"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import type { PriceStatus, ProductPriceRow } from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mp = messages.pricing.prices;
const CURRENCIES = ["THB", "USD", "EUR", "JPY", "SGD", "CNY"];
const STATUS_COLORS: Record<PriceStatus, string> = {
  current: "green",
  future: "blue",
  expired: "default",
};

interface Draft {
  id?: string;
  productCode: string;
  productName: string;
  currency: string;
  unitPrice: number | null;
  validFrom: string;
  validTo: string | null;
  note: string;
}

const money = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const thaiDay = (value: string) => dayjs(value).format("D MMM YYYY");

/**
 * CD-194 — the standard price list: one row per product code, currency and
 * range of days. The server refuses an overlapping range and names the row
 * it collides with; the message shows as it comes.
 */
export function PriceList({
  rows,
  q,
  status,
  canManage,
}: {
  rows: ProductPriceRow[];
  q: string;
  status: PriceStatus | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  function go(next: { q?: string; status?: PriceStatus | null }) {
    const params = new URLSearchParams();
    const query = next.q ?? q;
    const picked = next.status === undefined ? status : next.status;
    if (query) params.set("q", query);
    if (picked) params.set("status", picked);
    const qs = params.toString();
    router.push(qs ? `${ROUTES.pricingPrices}?${qs}` : ROUTES.pricingPrices);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = {
      unit_price: draft.unitPrice,
      valid_from: draft.validFrom,
      valid_to: draft.validTo,
      note: draft.note,
    };
    const result = draft.id
      ? await appApi(`pricing/prices/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await appApi("pricing/prices", {
          method: "POST",
          body: JSON.stringify({
            ...body,
            product_code: draft.productCode,
            currency: draft.currency,
          }),
        });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(mp.saved);
    setDraft(null);
    router.refresh();
  }

  async function remove(id: string) {
    const result = await appApi(`pricing/prices/${id}`, { method: "DELETE" });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(mp.removed);
    router.refresh();
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            {mp.title}
          </Title>
          <Text type="secondary">{mp.hint}</Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              setDraft({
                productCode: "",
                productName: "",
                currency: "THB",
                unitPrice: null,
                validFrom: dayjs().format("YYYY-MM-DD"),
                validTo: null,
                note: "",
              })
            }
          >
            {mp.add}
          </Button>
        )}
      </div>

      <Card>
        <Space orientation="vertical" className="w-full">
          <div className="flex flex-wrap items-center gap-2">
            <Input.Search
              allowClear
              defaultValue={q}
              placeholder={mp.search}
              style={{ maxWidth: 320 }}
              onSearch={(value) => go({ q: value.trim() })}
            />
            <Segmented<string>
              value={status ?? "all"}
              onChange={(value) =>
                go({ status: value === "all" ? null : (value as PriceStatus) })
              }
              options={[
                { value: "all", label: mp.all },
                ...(["current", "future", "expired"] as const).map((value) => ({
                  value,
                  label: mp.statuses[value],
                })),
              ]}
            />
          </div>
          <Table<ProductPriceRow>
            rowKey="id"
            size="small"
            dataSource={rows}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            locale={{ emptyText: mp.empty }}
            scroll={{ x: 900 }}
            columns={[
              {
                title: mp.product,
                key: "product",
                render: (_: unknown, row) => (
                  <div>
                    <Text strong>{row.productCode}</Text>
                    {row.productName && (
                      <div className="text-xs text-gray-500">
                        {row.productName}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: mp.unitPrice,
                key: "price",
                align: "right",
                width: 160,
                render: (_: unknown, row) =>
                  `${money(row.unitPrice)} ${row.currency}`,
              },
              {
                title: mp.period,
                key: "period",
                width: 230,
                render: (_: unknown, row) =>
                  `${thaiDay(row.validFrom)} – ${row.validTo ? thaiDay(row.validTo) : mp.noEnd}`,
              },
              {
                title: mp.status,
                dataIndex: "status",
                width: 110,
                render: (value: PriceStatus) => (
                  <Tag color={STATUS_COLORS[value]}>{mp.statuses[value]}</Tag>
                ),
              },
              {
                title: mp.note,
                dataIndex: "note",
                ellipsis: true,
              },
              ...(canManage
                ? [
                    {
                      key: "actions",
                      width: 90,
                      render: (_: unknown, row: ProductPriceRow) => (
                        <Space size={0}>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            aria-label={mp.edit}
                            onClick={() =>
                              setDraft({
                                id: row.id,
                                productCode: row.productCode,
                                productName: row.productName ?? "",
                                currency: row.currency,
                                unitPrice: row.unitPrice,
                                validFrom: row.validFrom,
                                validTo: row.validTo,
                                note: row.note,
                              })
                            }
                          />
                          <Popconfirm
                            title={mp.remove}
                            onConfirm={() => void remove(row.id)}
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Space>
      </Card>

      <Modal
        open={!!draft}
        title={draft?.id ? mp.edit : mp.add}
        okText={mp.save}
        okButtonProps={{
          loading: busy,
          disabled:
            !draft?.productCode || draft.unitPrice === null || !draft.validFrom,
        }}
        onOk={() => void save()}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        {draft && (
          <Space orientation="vertical" className="w-full">
            <div>
              <Text type="secondary">{mp.product}</Text>
              {draft.id ? (
                <div>
                  <Text strong>{draft.productCode}</Text>{" "}
                  <Text type="secondary">{draft.productName}</Text>
                </div>
              ) : (
                <ProductPicker
                  value={draft.productCode}
                  onPick={(product) =>
                    setDraft({
                      ...draft,
                      productCode: product.code,
                      productName: product.name,
                    })
                  }
                  onClear={() =>
                    setDraft({ ...draft, productCode: "", productName: "" })
                  }
                />
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
              <div>
                <Text type="secondary">{mp.currency}</Text>
                <Select
                  className="w-full"
                  value={draft.currency}
                  disabled={!!draft.id}
                  onChange={(currency: string) =>
                    setDraft({ ...draft, currency })
                  }
                  options={CURRENCIES.map((value) => ({ value, label: value }))}
                />
              </div>
              <div>
                <Text type="secondary">{mp.unitPrice}</Text>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={2}
                  value={draft.unitPrice}
                  onChange={(unitPrice) => setDraft({ ...draft, unitPrice })}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Text type="secondary">{mp.validFrom}</Text>
                <DatePicker
                  className="w-full"
                  allowClear={false}
                  value={draft.validFrom ? dayjs(draft.validFrom) : null}
                  onChange={(date) =>
                    setDraft({
                      ...draft,
                      validFrom: date ? date.format("YYYY-MM-DD") : "",
                    })
                  }
                />
              </div>
              <div>
                <Text type="secondary">{mp.validTo}</Text>
                <DatePicker
                  className="w-full"
                  placeholder={mp.noEnd}
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
              <Text type="secondary">{mp.note}</Text>
              <Input
                maxLength={500}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
