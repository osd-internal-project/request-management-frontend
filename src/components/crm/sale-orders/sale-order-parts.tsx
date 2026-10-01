"use client";

import { Empty, Table, Tag, Tooltip } from "antd";
import Text from "antd/es/typography/Text";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { messages } from "@/lib/messages";
import type {
  ErpSyncStatus,
  SaleOrderLine,
  SaleOrderRow,
} from "@/lib/api/types";

const md = messages.sales.opportunities.detail;
const ml = messages.sales.quotations.detail.line;

const ERP_COLOR: Record<ErpSyncStatus, string> = {
  not_ready: "default",
  pending: "processing",
  synced: "green",
  failed: "red",
  skipped: "default",
};

/**
 * CD-88 — สถานะการส่งเข้า SAP ของใบสั่งขาย: ป้าย + เลขใบของ SAP ถ้ามี, tooltip
 * บอกว่าทำไม (ยังไม่มีรายการ / รอส่ง / ข้อผิดพลาดล่าสุด).
 */
export function SaleOrderErpTag({ row }: { row: SaleOrderRow }) {
  const status = row.erpStatus;
  const cancelledInSap = status === "synced" && row.status === "cancelled";
  const label = cancelledInSap
    ? md.saleOrderErpCancelled
    : (md.saleOrderErpStatus[status] ?? status);

  // A held order (`not_ready`, e.g. CD-62 waiting for the customer's
  // approval) carries its reason, not an error.
  const hint = row.erpLastError
    ? status === "not_ready"
      ? row.erpLastError
      : md.saleOrderErpLastError(row.erpLastError)
    : md.saleOrderErpHint[status];

  const tag = <Tag color={ERP_COLOR[status] ?? "default"}>{label}</Tag>;

  return (
    <span className="inline-flex flex-col gap-0.5">
      {hint ? <Tooltip title={hint}>{tag}</Tooltip> : tag}
      {row.erpOrderNo && (
        <Text type="secondary" className="text-xs">
          {row.erpOrderNo}
        </Text>
      )}
    </span>
  );
}

/** CD-88 — รายการสินค้าของใบสั่งขาย (snapshot จากใบเสนอราคา), ใช้เป็นแถวที่กางออก. */
export function SaleOrderLines({ row }: { row: SaleOrderRow }) {
  if (!row.lines?.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={md.saleOrderNoLines}
      />
    );
  }

  return (
    <Table<SaleOrderLine>
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={row.lines}
      title={() => <Text strong>{md.saleOrderLinesTitle}</Text>}
      columns={[
        { title: "#", dataIndex: "lineNo", width: 48 },
        {
          title: ml.productCode,
          dataIndex: "productCode",
          width: 140,
          render: (code: string | null) => code ?? "—",
        },
        { title: ml.description, dataIndex: "description" },
        {
          title: ml.quantity,
          dataIndex: "quantity",
          width: 90,
          align: "right" as const,
          render: (quantity: SaleOrderLine["quantity"], line) =>
            `${Number(quantity).toLocaleString("th-TH")}${line.unit ? ` ${line.unit}` : ""}`,
        },
        {
          title: ml.unitPrice,
          dataIndex: "unitPrice",
          width: 120,
          align: "right" as const,
          render: (price: SaleOrderLine["unitPrice"]) => formatAmount(price),
        },
        {
          title: ml.discountPct,
          dataIndex: "discountPct",
          width: 90,
          align: "right" as const,
          render: (pct: SaleOrderLine["discountPct"]) =>
            Number(pct) ? `${Number(pct)}%` : "—",
        },
        {
          title: ml.lineTotal,
          dataIndex: "lineTotal",
          width: 130,
          align: "right" as const,
          render: (total: SaleOrderLine["lineTotal"]) => formatAmount(total),
        },
      ]}
    />
  );
}

/** Column + expandable config every sale-order table shares. */
export const saleOrderErpColumn = {
  title: md.saleOrderErp,
  key: "erp",
  width: 150,
  render: (_: unknown, row: SaleOrderRow) => <SaleOrderErpTag row={row} />,
};

export const saleOrderExpandable = {
  expandedRowRender: (row: SaleOrderRow) => <SaleOrderLines row={row} />,
};
