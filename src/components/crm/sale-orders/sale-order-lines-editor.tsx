"use client";

import { Button, Input, InputNumber, Table } from "antd";
import Text from "antd/es/typography/Text";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { messages } from "@/lib/messages";

const md = messages.sales.opportunities.detail;
const ml = messages.sales.quotations.detail.line;

/** One row being typed — numbers as the inputs hold them, `key` for React only. */
export interface SaleOrderDraftLine {
  key: string;
  productCode: string;
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  discountPct: number | null;
}

let seq = 0;
export function newSaleOrderLine(): SaleOrderDraftLine {
  seq += 1;
  return {
    key: `so-line-${seq}`,
    productCode: "",
    description: "",
    quantity: 1,
    unit: "",
    unitPrice: null,
    discountPct: null,
  };
}

/** Preview only — the server computes the stored totals with the quotation maths. */
export function draftLineTotal(line: SaleOrderDraftLine): number {
  const gross = (line.quantity ?? 0) * (line.unitPrice ?? 0);
  return Math.round(gross * (100 - (line.discountPct ?? 0))) / 100;
}

export function draftLinesTotal(lines: readonly SaleOrderDraftLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + draftLineTotal(line) * 100, 0)) / 100;
}

/** A row the backend will accept: description, quantity > 0, a price. */
export function draftLineComplete(line: SaleOrderDraftLine): boolean {
  return Boolean(line.description.trim()) && (line.quantity ?? 0) > 0 && line.unitPrice !== null;
}

/** The request body shape of `OpenSaleOrderDto.lines`. */
export function toSaleOrderLinePayload(line: SaleOrderDraftLine) {
  return {
    product_code: line.productCode.trim() || undefined,
    description: line.description.trim(),
    quantity: line.quantity ?? 0,
    unit: line.unit.trim() || undefined,
    unit_price: line.unitPrice ?? 0,
    discount_pct: line.discountPct ?? undefined,
  };
}

/**
 * CD-88 (PO 24 ก.ย. 2569) — รายการสินค้าตอนเปิดใบสั่งขายตรงจากโอกาสการขาย
 * (ไม่ผ่านใบเสนอราคา): เลือกรหัสจากรายการสินค้าจาก SAP เหมือนบรรทัดใบเสนอราคา
 * ไม่มีต้นทุน. ใบที่มีรายการส่งเข้า SAP ได้; มูลค่าใบ = ยอดรวมของรายการ.
 */
export function SaleOrderLinesEditor({
  lines,
  onChange,
}: {
  lines: SaleOrderDraftLine[];
  onChange: (lines: SaleOrderDraftLine[]) => void;
}) {
  function patch(key: string, change: Partial<SaleOrderDraftLine>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...change } : line)));
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Text className="text-xs">{md.saleOrderLinesTitle}</Text>
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => onChange([...lines, newSaleOrderLine()])}
        >
          {md.saleOrderAddLine}
        </Button>
      </div>
      <Table<SaleOrderDraftLine>
        size="small"
        rowKey="key"
        pagination={false}
        // Fixed: a long picked product name must not squeeze the description.
        tableLayout="fixed"
        scroll={{ x: 900 }}
        dataSource={lines}
        locale={{ emptyText: md.saleOrderLinesEmpty }}
        columns={[
          {
            title: ml.productCode,
            dataIndex: "productCode",
            width: 190,
            render: (value: string, row) => (
              <ProductPicker
                value={value}
                onPick={(product) =>
                  patch(row.key, {
                    productCode: product.code,
                    description: row.description || product.name,
                    unit: row.unit || (product.unit ?? ""),
                  })
                }
                onClear={() => patch(row.key, { productCode: "" })}
              />
            ),
          },
          {
            title: ml.description,
            dataIndex: "description",
            width: 220,
            render: (value: string, row) => (
              <Input
                value={value}
                maxLength={1000}
                onChange={(e) => patch(row.key, { description: e.target.value })}
              />
            ),
          },
          {
            title: ml.quantity,
            dataIndex: "quantity",
            width: 90,
            render: (value: number | null, row) => (
              <InputNumber
                className="w-full"
                min={0.001}
                value={value}
                onChange={(next) => patch(row.key, { quantity: next })}
              />
            ),
          },
          {
            title: ml.unit,
            dataIndex: "unit",
            width: 80,
            render: (value: string, row) => (
              <Input
                value={value}
                maxLength={30}
                onChange={(e) => patch(row.key, { unit: e.target.value })}
              />
            ),
          },
          {
            title: ml.unitPrice,
            dataIndex: "unitPrice",
            width: 120,
            render: (value: number | null, row) => (
              <InputNumber
                className="w-full"
                min={0}
                value={value}
                onChange={(next) => patch(row.key, { unitPrice: next })}
              />
            ),
          },
          {
            title: ml.discountPct,
            dataIndex: "discountPct",
            width: 80,
            render: (value: number | null, row) => (
              <InputNumber
                className="w-full"
                min={0}
                max={100}
                value={value}
                onChange={(next) => patch(row.key, { discountPct: next })}
              />
            ),
          },
          {
            title: ml.lineTotal,
            key: "total",
            width: 100,
            align: "right" as const,
            render: (_: unknown, row) => formatAmount(draftLineTotal(row)),
          },
          {
            title: "",
            key: "remove",
            width: 44,
            render: (_: unknown, row) => (
              <Button
                size="small"
                type="text"
                danger
                aria-label={md.saleOrderRemoveLine}
                icon={<DeleteOutlined />}
                onClick={() => onChange(lines.filter((line) => line.key !== row.key))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
