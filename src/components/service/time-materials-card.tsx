"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import type { StockRow, TimeMaterials } from "@/lib/api/service";
import { messages } from "@/lib/messages";

const m = messages.service.assets.timeMaterials;
const baht = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2 });

interface Adding {
  productCode: string;
  description: string;
  quantity: number | null;
  serialNo: string;
  billable: boolean;
  unitPrice: number | null;
  /** CD-245 — out of stock, from this warehouse */
  fromStock: boolean;
  warehouseCode: string | null;
  stock: StockRow[];
}

/**
 * CD-243 — on a service job's panel: the time logged against the case
 * (timesheets), the materials used, what they would charge, and — for those
 * who may see cost — the job's cost and margin.
 */
export function TimeMaterialsCard({
  workOrderId,
  billable,
}: {
  readonly workOrderId: string;
  readonly billable: boolean;
}) {
  const { message } = App.useApp();
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<TimeMaterials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<Adding | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void appApi<TimeMaterials>(`service-time-materials/${workOrderId}`).then(
      (result) => {
        if (!live) return;
        if (result.ok) setData(result.data);
        else setError(result.message);
      },
    );
    return () => {
      live = false;
    };
  }, [workOrderId, reload]);

  async function send(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string }>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(m.saved);
    setReload((n) => n + 1);
    return true;
  }

  if (!data) {
    return error ? (
      <Alert className="mt-3" type="error" showIcon title={error} />
    ) : null;
  }
  const editable = data.canEdit && !data.locked;

  return (
    <Card size="small" className="mt-3" title={m.title}>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      <Text type="secondary" className="block text-xs">
        {m.timeHint}
      </Text>
      <Text className="mb-1 block text-sm">
        {m.hours(
          String(data.time.approved),
          String(data.time.pending),
          String(data.time.billable),
        )}
      </Text>
      {data.time.people.length ? (
        <Table
          size="small"
          rowKey={(row) => `${row.name}|${row.workType}|${row.billable}`}
          pagination={false}
          dataSource={data.time.people}
          columns={[
            { title: m.person, dataIndex: "name" },
            {
              title: m.workType,
              render: (_: unknown, row) => (
                <span>
                  {row.workType} {!row.billable && <Tag>{m.notBillable}</Tag>}
                </span>
              ),
            },
            { title: m.approved, dataIndex: "approved", width: 110 },
            { title: m.pending, dataIndex: "pending", width: 110 },
          ]}
        />
      ) : (
        <Text type="secondary" className="block text-xs">
          {m.noTime}
        </Text>
      )}

      <Text strong className="mt-3 block text-xs">
        {m.materials}
      </Text>
      {data.locked && (
        <Text type="warning" className="block text-xs">
          {m.locked}
        </Text>
      )}
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={data.materials}
        locale={{ emptyText: m.noMaterials }}
        scroll={{ x: 700 }}
        columns={[
          {
            title: m.product,
            render: (_: unknown, row) =>
              `${row.productCode} · ${row.description}`,
          },
          { title: m.quantity, dataIndex: "quantity", width: 80 },
          {
            title: m.serial,
            width: 120,
            render: (_: unknown, row) => row.serialNo ?? "",
          },
          {
            title: m.price,
            width: 140,
            render: (_: unknown, row) =>
              row.unitPrice === null ? (
                <Text type="warning">{m.noPrice}</Text>
              ) : (
                <span>
                  {baht(row.unitPrice)}{" "}
                  {row.priceSource === "standard" && <Tag>{m.standard}</Tag>}
                </span>
              ),
          },
          ...(data.costs
            ? [
                {
                  title: m.cost,
                  width: 110,
                  render: (
                    _: unknown,
                    row: TimeMaterials["materials"][number],
                  ) => (row.unitCost === null ? "—" : baht(row.unitCost)),
                },
              ]
            : []),
          {
            title: m.billable,
            width: 110,
            render: (_: unknown, row) =>
              row.billable ? (
                <Tag color="orange">{m.billable}</Tag>
              ) : (
                <Tag>{m.covered}</Tag>
              ),
          },
          {
            title: m.fromStock,
            width: 170,
            render: (_: unknown, row) =>
              row.fromStock ? (
                <span>
                  <Tag
                    color={
                      row.erpStatus === "synced"
                        ? "green"
                        : row.erpStatus === "failed"
                          ? "red"
                          : "blue"
                    }
                  >
                    {m.erpStatus[row.erpStatus] ?? row.erpStatus}
                  </Tag>
                  <Text type="secondary" className="block text-xs">
                    {row.warehouseCode}
                    {row.erpDocNo ? ` · ${m.issueNo(row.erpDocNo)}` : ""}
                  </Text>
                  {row.erpLastError && row.erpStatus !== "synced" && (
                    <Text type="danger" className="block text-xs">
                      {row.erpLastError}
                    </Text>
                  )}
                </span>
              ) : null,
          },
          ...(editable
            ? [
                {
                  title: "",
                  width: 70,
                  render: (
                    _: unknown,
                    row: TimeMaterials["materials"][number],
                  ) => (
                    <Popconfirm
                      title={m.removeConfirm}
                      onConfirm={() =>
                        void send(
                          `service-time-materials/materials/${row.id}`,
                          "DELETE",
                        )
                      }
                    >
                      <Button size="small" danger>
                        {m.remove}
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
      {editable &&
        (adding ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto_auto]">
            <ProductPicker
              value={adding.productCode}
              onPick={(product) => {
                const picked = {
                  ...adding,
                  productCode: product.code,
                  description: product.name,
                  stock: [],
                  warehouseCode: null,
                };
                setAdding(picked);
                // CD-245 — what each warehouse holds, for a spare out of stock
                void appApi<StockRow[]>(
                  `service-time-materials/stock?codes=${encodeURIComponent(product.code)}`,
                ).then((result) => {
                  if (result.ok) setAdding({ ...picked, stock: result.data });
                });
              }}
              onClear={() => setAdding({ ...adding, productCode: "" })}
            />
            <InputNumber
              className="w-full"
              min={0.001}
              placeholder={m.quantity}
              value={adding.quantity}
              onChange={(value) => setAdding({ ...adding, quantity: value })}
            />
            <Input
              placeholder={m.serial}
              maxLength={100}
              value={adding.serialNo}
              onChange={(event) =>
                setAdding({ ...adding, serialNo: event.target.value })
              }
            />
            <InputNumber
              className="w-full"
              min={0}
              placeholder={m.priceHint}
              value={adding.unitPrice}
              onChange={(value) => setAdding({ ...adding, unitPrice: value })}
            />
            <Space direction="vertical" size={2}>
              <Checkbox
                checked={adding.fromStock}
                onChange={(event) =>
                  setAdding({ ...adding, fromStock: event.target.checked })
                }
              >
                {m.fromStock}
              </Checkbox>
              {adding.fromStock && (
                <Select
                  size="small"
                  style={{ minWidth: 160 }}
                  placeholder={m.warehouse}
                  value={adding.warehouseCode ?? undefined}
                  options={adding.stock.map((row) => ({
                    value: row.warehouseCode,
                    label: m.onHand(row.warehouseCode, row.onHand),
                  }))}
                  onChange={(value: string) =>
                    setAdding({ ...adding, warehouseCode: value })
                  }
                />
              )}
            </Space>
            <Checkbox
              checked={adding.billable}
              onChange={(event) =>
                setAdding({ ...adding, billable: event.target.checked })
              }
            >
              {m.billable}
            </Checkbox>
            <Space>
              <Button
                type="primary"
                loading={busy}
                disabled={
                  !adding.productCode ||
                  !adding.quantity ||
                  (adding.fromStock && !adding.warehouseCode)
                }
                onClick={() =>
                  void send(
                    `service-time-materials/${workOrderId}/materials`,
                    "POST",
                    {
                      product_code: adding.productCode,
                      description: adding.description || undefined,
                      quantity: adding.quantity,
                      serial_no: adding.serialNo.trim() || undefined,
                      billable: adding.billable,
                      unit_price: adding.unitPrice ?? undefined,
                      from_stock: adding.fromStock,
                      warehouse_code: adding.fromStock
                        ? (adding.warehouseCode ?? undefined)
                        : undefined,
                    },
                  ).then((ok) => ok && setAdding(null))
                }
              >
                {m.add}
              </Button>
              <Button onClick={() => setAdding(null)}>✕</Button>
            </Space>
          </div>
        ) : (
          <Button
            className="mt-2"
            size="small"
            onClick={() =>
              setAdding({
                productCode: "",
                description: "",
                quantity: 1,
                serialNo: "",
                billable,
                unitPrice: null,
                fromStock: false,
                warehouseCode: null,
                stock: [],
              })
            }
          >
            {m.addMaterial}
          </Button>
        ))}

      {billable && (
        <div className="mt-3">
          <Text strong className="block text-xs">
            {m.charge}
          </Text>
          {data.charge.lines.map((line, index) => (
            <Text key={index} className="block text-xs">
              {line.description} — {line.quantity} {line.unit ?? ""} ×{" "}
              {baht(line.unitPrice)}
            </Text>
          ))}
          {data.charge.unratedWorkTypes.length > 0 && (
            <Text type="warning" className="block text-xs">
              {m.unrated(data.charge.unratedWorkTypes.join(", "))}
            </Text>
          )}
          {data.charge.unpricedMaterials.length > 0 && (
            <Text type="warning" className="block text-xs">
              {m.unpriced(data.charge.unpricedMaterials.join(", "))}
            </Text>
          )}
        </div>
      )}

      {data.costs && (
        <div className="mt-3">
          <Text strong className="block text-xs">
            {m.costs}
          </Text>
          <Text className="block text-xs">
            {m.costLine(
              baht(data.costs.revenue),
              baht(data.costs.labour.cost),
              baht(data.costs.materials.cost),
              baht(data.costs.profit),
              data.costs.marginPct === null ? "" : String(data.costs.marginPct),
            )}
          </Text>
        </div>
      )}
    </Card>
  );
}
