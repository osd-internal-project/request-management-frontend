"use client";

import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import type { BoqKind, BoqLine, BoqSummary } from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const mb = messages.presales.boq;
const KINDS = Object.keys(mb.kinds) as BoqKind[];

const money = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

/** The summary the page shows, worked out from the lines on screen. */
export function summarise(lines: readonly BoqLine[]): BoqSummary {
  const costed = lines.filter((line) => line.refUnitCost !== null);
  return {
    lines: lines.length,
    missing_code: lines.filter((line) => !line.productCode).length,
    missing_cost: lines.length - costed.length,
    ref_total: costed.reduce(
      (sum, line) => sum + line.quantity * (line.refUnitCost ?? 0),
      0,
    ),
  };
}

/**
 * CD-135 — BOQ / BOM, part of the version and locked with it: equipment,
 * materials, software and services, each with its SAP product code. A
 * version locks only when every line has a code still sold (handoff 3 →
 * Pricing); a line without a reference cost is flagged for CD-136.
 */
export function BoqCard({
  lines,
  editable,
  onChange,
}: {
  lines: BoqLine[];
  editable: boolean;
  onChange: (lines: BoqLine[]) => void;
}) {
  const summary = summarise(lines);
  const setLine = (index: number, patch: Partial<BoqLine>) =>
    onChange(
      lines.map((line, at) => (at === index ? { ...line, ...patch } : line)),
    );

  return (
    <Card
      size="small"
      title={`${mb.title} · ${summary.lines}`}
      extra={
        <Text type="secondary" className="text-xs">
          {mb.summary(
            summary.missing_code,
            summary.missing_cost,
            money(summary.ref_total),
          )}
        </Text>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {mb.hint}
      </Text>
      {lines.length || editable ? (
        <Table<BoqLine & { index: number }>
          size="small"
          rowKey="index"
          pagination={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: mb.empty }}
          dataSource={lines.map((line, index) => ({ ...line, index }))}
          columns={[
            { title: "#", width: 40, render: (_, row) => row.index + 1 },
            {
              title: mb.kind,
              dataIndex: "kind",
              width: 120,
              render: (kind: BoqKind, row) =>
                editable ? (
                  <Select
                    value={kind}
                    style={{ width: "100%" }}
                    options={KINDS.map((value) => ({
                      value,
                      label: mb.kinds[value],
                    }))}
                    onChange={(value: BoqKind) =>
                      setLine(row.index, { kind: value })
                    }
                  />
                ) : (
                  mb.kinds[kind]
                ),
            },
            {
              title: mb.productCode,
              dataIndex: "productCode",
              width: 240,
              render: (code: string, row) =>
                editable ? (
                  <ProductPicker
                    value={code}
                    onPick={(product) =>
                      setLine(row.index, {
                        productCode: product.code,
                        name: row.name || product.name,
                        unit: row.unit || product.unit || "",
                      })
                    }
                    onClear={() => setLine(row.index, { productCode: "" })}
                  />
                ) : code ? (
                  code
                ) : (
                  <Tag color="red">{mb.noCode}</Tag>
                ),
            },
            {
              title: mb.name,
              dataIndex: "name",
              render: (name: string, row) =>
                editable ? (
                  <>
                    <Input
                      value={name}
                      maxLength={500}
                      placeholder={mb.name}
                      onChange={(event) =>
                        setLine(row.index, { name: event.target.value })
                      }
                    />
                    <Input
                      className="mt-1"
                      size="small"
                      value={row.description}
                      maxLength={2000}
                      placeholder={mb.description}
                      onChange={(event) =>
                        setLine(row.index, { description: event.target.value })
                      }
                    />
                  </>
                ) : (
                  <>
                    {name}
                    {row.description && (
                      <Text type="secondary" className="block text-xs">
                        {row.description}
                      </Text>
                    )}
                  </>
                ),
            },
            {
              title: mb.model,
              dataIndex: "model",
              width: 130,
              render: (model: string, row) =>
                editable ? (
                  <Input
                    value={model}
                    maxLength={200}
                    onChange={(event) =>
                      setLine(row.index, { model: event.target.value })
                    }
                  />
                ) : (
                  model || "—"
                ),
            },
            {
              title: mb.quantity,
              dataIndex: "quantity",
              width: 150,
              render: (quantity: number, row) =>
                editable ? (
                  <Space.Compact>
                    <InputNumber
                      value={quantity}
                      min={0}
                      style={{ width: 80 }}
                      onChange={(value) =>
                        setLine(row.index, { quantity: Number(value) || 0 })
                      }
                    />
                    <Input
                      value={row.unit}
                      maxLength={40}
                      style={{ width: 70 }}
                      placeholder={mb.unit}
                      onChange={(event) =>
                        setLine(row.index, { unit: event.target.value })
                      }
                    />
                  </Space.Compact>
                ) : (
                  `${quantity} ${row.unit}`
                ),
            },
            {
              title: mb.refUnitCost,
              dataIndex: "refUnitCost",
              width: 150,
              render: (cost: number | null, row) =>
                editable ? (
                  <InputNumber
                    value={cost ?? undefined}
                    min={0}
                    style={{ width: "100%" }}
                    placeholder={mb.noCost}
                    onChange={(value) =>
                      setLine(row.index, {
                        refUnitCost:
                          value === null || value === undefined
                            ? null
                            : Number(value),
                      })
                    }
                  />
                ) : cost === null ? (
                  <Tag color="gold">{mb.noCost}</Tag>
                ) : (
                  money(cost)
                ),
            },
            ...(editable
              ? [
                  {
                    key: "remove",
                    width: 48,
                    render: (_: unknown, row: { index: number }) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label={mb.remove}
                        onClick={() =>
                          onChange(lines.filter((_, at) => at !== row.index))
                        }
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={mb.empty} />
      )}
      {editable && (
        <Button
          className="mt-2"
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            onChange([
              ...lines,
              {
                kind: "equipment",
                productCode: "",
                name: "",
                description: "",
                model: "",
                quantity: 1,
                unit: "",
                refUnitCost: null,
              },
            ])
          }
        >
          {mb.add}
        </Button>
      )}
    </Card>
  );
}
