"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  InputNumber,
  Popconfirm,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import {
  matchProductBundle,
  type ProductBundle,
} from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";

const mq = messages.sales.leads.quoteItems;

interface Row {
  key: number;
  code: string;
  name: string | null;
  quantity: number | null;
  termMonths: number | null;
  /** Shown, but only quoted when ticked — a bundle's optional item. */
  included: boolean;
  optional: boolean;
  unitPrice: number | null | undefined;
  priceModel: string | null;
}

/** `intakeData.products` as the backend reads it (`listedItemsOfLead`). */
function listedOf(value: unknown): Pick<Row, "code" | "quantity" | "termMonths">[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (typeof entry === "string" && entry.trim()) {
      return [{ code: entry.trim(), quantity: 1, termMonths: null }];
    }
    if (typeof entry !== "object" || entry === null) return [];
    const row = entry as Record<string, unknown>;
    const code = row.product_code ?? row.code;
    if (typeof code !== "string" || !code.trim()) return [];
    const quantity = Number(row.quantity ?? row.qty ?? 1);
    const term = Number(row.term_months);
    return [
      {
        code: code.trim(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        termMonths: Number.isInteger(term) && term >= 1 ? term : null,
      },
    ];
  });
}

const money = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * รายการในใบเสนอราคา (12 พ.ย. 2569) — what a quotation for this Lead will
 * carry: the Lead's own list when the salesperson adjusted it, else the
 * mandatory items of the bundle of its product. Adjusting writes
 * `intakeData.products`; "use the bundle" drops that key again.
 */
export function LeadQuoteItemsCard({
  leadId,
  product,
  listed: rawListed,
  canEdit,
}: {
  readonly leadId: string;
  /** The product picked on the proposal card, else Sub Product. */
  readonly product: string | null;
  readonly listed: unknown;
  readonly canEdit: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [bundle, setBundle] = useState<ProductBundle | null>(null);
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [nextKey, setNextKey] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (!product) return;
    void matchProductBundle(product).then((result) => {
      if (live) setBundle(result.ok ? result.data.bundle : null);
    });
    return () => {
      live = false;
    };
  }, [product]);

  const inUse = product ? bundle : null;
  const listed = listedOf(rawListed);
  const own = listed.length > 0;
  const known = new Map(
    (inUse?.items ?? []).map((item) => [item.productCode, item]),
  );

  /** What is shown: the Lead's own list, else the bundle with its extras unticked. */
  const rows: Row[] = own
    ? listed.map((item, key) => {
        const match = known.get(item.code);
        return {
          key,
          ...item,
          name: match?.productName ?? null,
          included: true,
          optional: false,
          unitPrice: match ? match.unitPrice : undefined,
          priceModel: match?.priceModel ?? null,
        };
      })
    : (inUse?.items ?? []).map((item, key) => ({
        key,
        code: item.productCode,
        name: item.productName,
        quantity: item.quantity,
        termMonths: item.termMonths,
        included: !item.optional,
        optional: item.optional,
        unitPrice: item.unitPrice,
        priceModel: item.priceModel,
      }));

  function startEdit() {
    // editing the Lead's own list still offers the bundle's items left out
    const extras: Row[] = own
      ? (inUse?.items ?? [])
          .filter((item) => !listed.some((row) => row.code === item.productCode))
          .map((item, index) => ({
            key: rows.length + index,
            code: item.productCode,
            name: item.productName,
            quantity: item.quantity,
            termMonths: item.termMonths,
            included: false,
            optional: true,
            unitPrice: item.unitPrice,
            priceModel: item.priceModel,
          }))
      : [];
    const next = [...rows, ...extras];
    setDraft(next);
    setNextKey(next.length);
  }

  function patch(key: number, change: Partial<Row>) {
    setDraft((current) =>
      current
        ? current.map((row) => (row.key === key ? { ...row, ...change } : row))
        : current,
    );
  }

  async function write(products: unknown, done: string) {
    setBusy(true);
    const result = await appApi(`leads/${leadId}/intake-data`, {
      method: "PATCH",
      body: JSON.stringify({ data: { products } }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(done);
    setDraft(null);
    router.refresh();
  }

  const chosen = (draft ?? []).filter((row) => row.included && row.code);
  const valid =
    chosen.length > 0 &&
    chosen.every((row) => row.quantity !== null && row.quantity > 0) &&
    new Set(chosen.map((row) => row.code)).size === chosen.length;

  const save = () =>
    write(
      chosen.map((row) => ({
        product_code: row.code,
        quantity: row.quantity,
        ...(row.termMonths ? { term_months: row.termMonths } : {}),
      })),
      mq.saved,
    );

  const editing = draft !== null;
  const shown = draft ?? rows;
  const unpriced = rows.some((row) => row.included && row.unitPrice === null);

  return (
    <Card
      size="small"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {mq.title}
          {product && <Tag color="blue">{product}</Tag>}
          {own ? (
            <Tag color="gold">{mq.sourceLead}</Tag>
          ) : inUse ? (
            <Tag>{mq.sourceBundle}</Tag>
          ) : null}
        </span>
      }
      extra={
        canEdit && !editing ? (
          <span className="flex items-center gap-1">
            {own && (
              <Popconfirm
                title={inUse ? mq.resetConfirm : mq.clearConfirm}
                onConfirm={() => void write(null, mq.resetDone)}
              >
                <Button type="link" size="small" loading={busy}>
                  {inUse ? mq.reset : mq.clear}
                </Button>
              </Popconfirm>
            )}
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={startEdit}
            >
              {mq.edit}
            </Button>
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {!editing && rows.length === 0 && (
          <Text type="secondary">
            {product ? mq.noBundle(product) : mq.noProduct}
          </Text>
        )}
        {!editing && unpriced && (
          <Alert type="warning" showIcon message={mq.unpriced} />
        )}
        {shown.length > 0 && (
          <Table<Row>
            rowKey="key"
            size="small"
            dataSource={shown}
            pagination={false}
            scroll={{ x: 560 }}
            columns={[
              ...(editing
                ? [
                    {
                      key: "included",
                      width: 40,
                      render: (_: unknown, row: Row) => (
                        <Checkbox
                          checked={row.included}
                          aria-label={mq.include}
                          onChange={(event) =>
                            patch(row.key, { included: event.target.checked })
                          }
                        />
                      ),
                    },
                  ]
                : []),
              {
                title: mq.product,
                key: "product",
                render: (_: unknown, row: Row) =>
                  editing && !row.name ? (
                    <ProductPicker
                      value={row.code}
                      onPick={(picked) =>
                        patch(row.key, { code: picked.code })
                      }
                      onClear={() => patch(row.key, { code: "" })}
                    />
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-2">
                      <Text strong disabled={!row.included}>
                        {row.code}
                      </Text>
                      {row.name && <Text type="secondary">{row.name}</Text>}
                      {row.optional && <Tag>{mq.extra}</Tag>}
                    </span>
                  ),
              },
              {
                title: mq.quantity,
                key: "quantity",
                width: 110,
                align: "right" as const,
                render: (_: unknown, row: Row) =>
                  editing ? (
                    <InputNumber
                      className="w-full"
                      min={0.0001}
                      max={1_000_000}
                      disabled={!row.included}
                      value={row.quantity}
                      onChange={(quantity) => patch(row.key, { quantity })}
                    />
                  ) : (
                    row.quantity
                  ),
              },
              {
                title: mq.termMonths,
                key: "term",
                width: 90,
                align: "right" as const,
                render: (_: unknown, row: Row) =>
                  editing ? (
                    <InputNumber
                      className="w-full"
                      min={1}
                      max={120}
                      precision={0}
                      disabled={!row.included}
                      value={row.termMonths}
                      onChange={(termMonths) => patch(row.key, { termMonths })}
                    />
                  ) : (
                    (row.termMonths ?? "")
                  ),
              },
              ...(editing
                ? [
                    {
                      key: "remove",
                      width: 40,
                      render: (_: unknown, row: Row) => (
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={mq.remove}
                          onClick={() =>
                            setDraft(
                              (draft ?? []).filter(
                                (item) => item.key !== row.key,
                              ),
                            )
                          }
                        />
                      ),
                    },
                  ]
                : [
                    {
                      title: mq.unitPrice,
                      key: "price",
                      width: 160,
                      align: "right" as const,
                      render: (_: unknown, row: Row) =>
                        row.unitPrice === undefined ? (
                          ""
                        ) : row.unitPrice === null ? (
                          <Tag color={row.included ? "orange" : "default"}>
                            {mq.noPrice}
                          </Tag>
                        ) : (
                          <span className="tabular-nums">
                            {money(row.unitPrice)}
                            {row.priceModel === "monthly" ? mq.perMonth : ""}
                          </span>
                        ),
                    },
                  ]),
            ]}
          />
        )}
        {editing && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={(draft ?? []).length >= 50}
              onClick={() => {
                setDraft([
                  ...(draft ?? []),
                  {
                    key: nextKey,
                    code: "",
                    name: null,
                    quantity: 1,
                    termMonths: null,
                    included: true,
                    optional: false,
                    unitPrice: undefined,
                    priceModel: null,
                  },
                ]);
                setNextKey(nextKey + 1);
              }}
            >
              {mq.add}
            </Button>
            <span className="flex gap-2">
              <Button size="small" onClick={() => setDraft(null)}>
                {mq.cancel}
              </Button>
              <Button
                size="small"
                type="primary"
                loading={busy}
                disabled={!valid}
                onClick={() => void save()}
              >
                {mq.save}
              </Button>
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
