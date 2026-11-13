"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import type { ProductBundle, ProductBundleItem } from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";

const mb = messages.pricing.bundles;

interface DraftItem {
  key: number;
  productCode: string;
  productName: string | null;
  quantity: number | null;
  termMonths: number | null;
  optional: boolean;
  fixedQuantity: boolean;
}

interface DraftQuestion {
  row: number;
  /** kept so answers already collected stay tied to the question */
  key?: string;
  question: string;
  hints: string;
}

interface Draft {
  id?: string;
  name: string;
  note: string;
  active: boolean;
  items: DraftItem[];
  questions: DraftQuestion[];
}

const money = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** A standard price, or the warning that there is none. */
function PriceCell({ item }: { item: ProductBundleItem }) {
  if (item.unitPrice === null) {
    return (
      <Tooltip title={item.optional ? undefined : mb.noPriceHint}>
        <Tag color={item.optional ? "default" : "orange"}>{mb.noPrice}</Tag>
      </Tooltip>
    );
  }
  return (
    <span className="tabular-nums">
      {money(item.unitPrice)}
      {item.priceModel === "monthly" ? mb.perMonth : ""}
    </span>
  );
}

/**
 * ชุดรายการของ product (12 พ.ย. 2569) — for each product a customer may ask
 * about, the SAP items its quotation carries. Mandatory items always go in;
 * optional ones are offered to the salesperson on the Lead.
 */
export function BundleList({
  rows,
  canManage,
}: {
  rows: ProductBundle[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [nextKey, setNextKey] = useState(1);

  const blankItem = (key: number): DraftItem => ({
    key,
    productCode: "",
    productName: null,
    quantity: 1,
    termMonths: null,
    optional: false,
    fixedQuantity: false,
  });

  function openNew() {
    setDraft({
      name: "",
      note: "",
      active: true,
      items: [blankItem(0)],
      questions: [],
    });
    setNextKey(1);
  }

  function openEdit(row: ProductBundle) {
    setDraft({
      id: row.id,
      name: row.name,
      note: row.note,
      active: row.active,
      items: row.items.map((item, key) => ({
        key,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        termMonths: item.termMonths,
        optional: item.optional,
        fixedQuantity: item.fixedQuantity ?? false,
      })),
      questions: (row.requirements ?? []).map((question, index) => ({
        row: index,
        key: question.key,
        question: question.question,
        hints: question.hints.join(", "),
      })),
    });
    setNextKey(Math.max(row.items.length, row.requirements?.length ?? 0));
  }

  function patchQuestion(row: number, patch: Partial<DraftQuestion>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.row === row ? { ...question, ...patch } : question,
            ),
          }
        : current,
    );
  }

  function patchItem(key: number, patch: Partial<DraftItem>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.key === key ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  }

  const filled = draft?.items.filter((item) => item.productCode) ?? [];
  const hasMain = filled.some((item) => !item.optional);
  const valid =
    !!draft?.name.trim() &&
    hasMain &&
    filled.every((item) => item.quantity !== null && item.quantity > 0);

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = JSON.stringify({
      name: draft.name.trim(),
      note: draft.note,
      active: draft.active,
      items: filled.map((item) => ({
        product_code: item.productCode,
        quantity: item.quantity,
        term_months: item.termMonths,
        optional: item.optional,
        fixed_quantity: item.fixedQuantity,
      })),
      requirements: draft.questions
        .filter((question) => question.question.trim())
        .map((question) => ({
          ...(question.key ? { key: question.key } : {}),
          question: question.question.trim(),
          hints: question.hints
            .split(",")
            .map((hint) => hint.trim())
            .filter(Boolean),
        })),
    });
    const result = draft.id
      ? await appApi(`pricing/product-bundles/${draft.id}`, {
          method: "PATCH",
          body,
        })
      : await appApi("pricing/product-bundles", { method: "POST", body });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(mb.saved);
    setDraft(null);
    router.refresh();
  }

  async function remove(id: string) {
    const result = await appApi(`pricing/product-bundles/${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(mb.removed);
    router.refresh();
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            {mb.title}
          </Title>
          <Text type="secondary">{mb.hint}</Text>
        </div>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            {mb.add}
          </Button>
        )}
      </div>
      <Card>
        <Table<ProductBundle>
          rowKey="id"
          size="small"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: mb.empty }}
          scroll={{ x: 720 }}
          expandable={{
            expandedRowRender: (row) => (
              <Table<ProductBundleItem>
                rowKey="productCode"
                size="small"
                dataSource={row.items}
                pagination={false}
                columns={[
                  {
                    title: mb.product,
                    key: "product",
                    render: (_: unknown, item) => (
                      <Space size={6} wrap>
                        <Text strong>{item.productCode}</Text>
                        {item.productName ? (
                          <Text type="secondary">{item.productName}</Text>
                        ) : (
                          <Tag color="red">{mb.unknownProduct}</Tag>
                        )}
                      </Space>
                    ),
                  },
                  {
                    title: mb.kind,
                    dataIndex: "optional",
                    width: 90,
                    render: (optional: boolean) =>
                      optional ? (
                        <Tag>{mb.extra}</Tag>
                      ) : (
                        <Tag color="blue">{mb.main}</Tag>
                      ),
                  },
                  {
                    title: mb.quantity,
                    key: "quantity",
                    width: 110,
                    align: "right",
                    render: (_: unknown, item) => (
                      <Space size={4}>
                        {`${item.quantity}${item.unit ? ` ${item.unit}` : ""}`}
                        {item.fixedQuantity && (
                          <Tooltip title={mb.fixedHint}>
                            <Tag>{mb.fixedTag}</Tag>
                          </Tooltip>
                        )}
                      </Space>
                    ),
                  },
                  {
                    title: mb.termMonths,
                    dataIndex: "termMonths",
                    width: 80,
                    align: "right",
                    render: (value: number | null) => value ?? "",
                  },
                  {
                    title: mb.unitPrice,
                    key: "price",
                    width: 170,
                    align: "right",
                    render: (_: unknown, item) => <PriceCell item={item} />,
                  },
                ]}
              />
            ),
          }}
          columns={[
            {
              title: mb.name,
              dataIndex: "name",
              render: (name: string) => <Text strong>{name}</Text>,
            },
            {
              title: mb.items,
              key: "items",
              width: 260,
              render: (_: unknown, row) => {
                const extra = row.items.filter((item) => item.optional).length;
                const unpriced = row.items.some(
                  (item) => !item.optional && item.unitPrice === null,
                );
                return (
                  <Space size={6}>
                    {mb.itemCount(row.items.length - extra, extra)}
                    {row.requirements?.length > 0 && (
                      <Tag color="blue">
                        {mb.questionCount(row.requirements.length)}
                      </Tag>
                    )}
                    {unpriced && (
                      <Tooltip title={mb.noPriceHint}>
                        <Tag color="orange">{mb.noPrice}</Tag>
                      </Tooltip>
                    )}
                  </Space>
                );
              },
            },
            {
              title: mb.active,
              dataIndex: "active",
              width: 90,
              render: (value: boolean) =>
                value ? (
                  <Tag color="green">{mb.active}</Tag>
                ) : (
                  <Tag>{mb.inactive}</Tag>
                ),
            },
            { title: mb.note, dataIndex: "note", ellipsis: true },
            ...(canManage
              ? [
                  {
                    key: "actions",
                    width: 90,
                    render: (_: unknown, row: ProductBundle) => (
                      <Space size={0}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          aria-label={mb.edit}
                          onClick={() => openEdit(row)}
                        />
                        <Popconfirm
                          title={mb.remove}
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
      </Card>

      <Modal
        open={!!draft}
        title={draft?.id ? mb.edit : mb.add}
        width={860}
        okText={mb.save}
        okButtonProps={{ loading: busy, disabled: !valid }}
        onOk={() => void save()}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        {draft && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <Text type="secondary">{mb.name}</Text>
                <Input
                  maxLength={120}
                  placeholder={mb.namePlaceholder}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={draft.active}
                  onChange={(active) => setDraft({ ...draft, active })}
                />
                <Text>{mb.active}</Text>
              </div>
            </div>
            <div>
              <Text type="secondary">{mb.items}</Text>
              <Table<DraftItem>
                rowKey="key"
                size="small"
                dataSource={draft.items}
                pagination={false}
                scroll={{ x: 800 }}
                columns={[
                  {
                    title: mb.product,
                    key: "product",
                    render: (_: unknown, item) => (
                      <ProductPicker
                        value={item.productCode}
                        onPick={(product) =>
                          patchItem(item.key, {
                            productCode: product.code,
                            productName: product.name,
                          })
                        }
                        onClear={() =>
                          patchItem(item.key, {
                            productCode: "",
                            productName: null,
                          })
                        }
                      />
                    ),
                  },
                  {
                    title: mb.quantity,
                    key: "quantity",
                    width: 110,
                    render: (_: unknown, item) => (
                      <InputNumber
                        className="w-full"
                        min={0.0001}
                        max={1_000_000}
                        value={item.quantity}
                        onChange={(quantity) =>
                          patchItem(item.key, { quantity })
                        }
                      />
                    ),
                  },
                  {
                    title: (
                      <Tooltip title={mb.termHint}>{mb.termMonths}</Tooltip>
                    ),
                    key: "term",
                    width: 90,
                    render: (_: unknown, item) => (
                      <InputNumber
                        className="w-full"
                        min={1}
                        max={120}
                        precision={0}
                        value={item.termMonths}
                        onChange={(termMonths) =>
                          patchItem(item.key, { termMonths })
                        }
                      />
                    ),
                  },
                  {
                    title: mb.extraSwitch,
                    key: "optional",
                    width: 100,
                    render: (_: unknown, item) => (
                      <Switch
                        size="small"
                        checked={item.optional}
                        onChange={(optional) =>
                          patchItem(item.key, { optional })
                        }
                      />
                    ),
                  },
                  {
                    title: (
                      <Tooltip title={mb.fixedHint}>{mb.fixedSwitch}</Tooltip>
                    ),
                    key: "fixed",
                    width: 100,
                    render: (_: unknown, item) => (
                      <Switch
                        size="small"
                        checked={item.fixedQuantity}
                        onChange={(fixedQuantity) =>
                          patchItem(item.key, { fixedQuantity })
                        }
                      />
                    ),
                  },
                  {
                    key: "remove",
                    width: 44,
                    render: (_: unknown, item) => (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={mb.removeItem}
                        disabled={draft.items.length === 1}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: draft.items.filter(
                              (row) => row.key !== item.key,
                            ),
                          })
                        }
                      />
                    ),
                  },
                ]}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  disabled={draft.items.length >= 50}
                  onClick={() => {
                    setDraft({
                      ...draft,
                      items: [...draft.items, blankItem(nextKey)],
                    });
                    setNextKey(nextKey + 1);
                  }}
                >
                  {mb.addItem}
                </Button>
                {filled.length > 0 && !hasMain && (
                  <Text type="danger">{mb.needMain}</Text>
                )}
              </div>
            </div>
            <div>
              <Text strong>{mb.requirements}</Text>
              <div>
                <Text type="secondary">{mb.requirementsHint}</Text>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {draft.questions.map((question) => (
                  <div
                    key={question.row}
                    className="grid gap-2 sm:grid-cols-[1fr_260px_auto]"
                  >
                    <Input
                      maxLength={300}
                      aria-label={mb.question}
                      placeholder={mb.questionPlaceholder}
                      value={question.question}
                      onChange={(event) =>
                        patchQuestion(question.row, {
                          question: event.target.value,
                        })
                      }
                    />
                    <Tooltip title={mb.hintsHint}>
                      <Input
                        aria-label={mb.hints}
                        placeholder={mb.hintsPlaceholder}
                        value={question.hints}
                        onChange={(event) =>
                          patchQuestion(question.row, {
                            hints: event.target.value,
                          })
                        }
                      />
                    </Tooltip>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={mb.removeQuestion}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          questions: draft.questions.filter(
                            (row) => row.row !== question.row,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <div>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    disabled={draft.questions.length >= 15}
                    onClick={() => {
                      setDraft({
                        ...draft,
                        questions: [
                          ...draft.questions,
                          { row: nextKey, question: "", hints: "" },
                        ],
                      });
                      setNextKey(nextKey + 1);
                    }}
                  >
                    {mb.addQuestion}
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Text type="secondary">{mb.note}</Text>
              <Input
                maxLength={500}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </Space>
  );
}
