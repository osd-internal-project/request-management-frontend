"use client";

import { useEffect, useState } from "react";
import { Alert, Empty, Skeleton, Table, Tag } from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.customers.detail.invoices;

interface InvoiceRow {
  doc_no: string;
  reference: string | null;
  issued_on: string;
  due_on: string | null;
  currency: string;
  total: number;
  paid: number;
  outstanding: number;
  status: "open" | "paid" | "cancelled";
  overdue: boolean;
}

interface InvoicesResponse {
  source: "live" | "mock" | "not_synced" | "unavailable";
  as_of: string | null;
  summary: {
    open_count: number;
    outstanding: number;
    overdue_count: number;
    overdue_amount: number;
  } | null;
  invoices: InvoiceRow[];
}

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const day = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";

/**
 * CD-89 / C360-02 — ใบแจ้งหนี้และการรับชำระจาก SAP. โหลดเมื่อเปิดแท็บเท่านั้น
 * (antd ไม่ render แท็บที่ยังไม่เคยเปิด) — หน้า 360° จึงไม่รอ SAP.
 */
export function CustomerInvoicesTab({ customerId }: { customerId: string }) {
  const [data, setData] = useState<InvoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void appApi<InvoicesResponse>(`customers/${customerId}/invoices`).then(
      (result) => {
        if (result.ok) setData(result.data);
        else setError(result.message);
      },
    );
  }, [customerId]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!data) return <Skeleton active paragraph={{ rows: 4 }} />;

  if (data.source !== "live") {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={m.source[data.source]}
      />
    );
  }

  const summary = data.summary!;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <Text>
          {m.openSummary(summary.open_count, baht(summary.outstanding))}
        </Text>
        {summary.overdue_count > 0 && (
          <Text type="danger">
            {m.overdueSummary(
              summary.overdue_count,
              baht(summary.overdue_amount),
            )}
          </Text>
        )}
        <Text type="secondary" className="text-xs">
          {m.asOf(dayjs(data.as_of).format("DD/MM/YYYY HH:mm"))}
        </Text>
      </div>

      {data.invoices.length ? (
        <Table<InvoiceRow>
          rowKey="doc_no"
          size="small"
          dataSource={data.invoices}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: true }}
          columns={[
            { title: m.columns.docNo, dataIndex: "doc_no" },
            {
              title: m.columns.reference,
              dataIndex: "reference",
              render: (value: string | null) => value ?? "—",
            },
            { title: m.columns.issued, dataIndex: "issued_on", render: day },
            {
              title: m.columns.due,
              dataIndex: "due_on",
              render: (value: string | null, row) =>
                row.overdue ? (
                  <Text type="danger">{day(value)}</Text>
                ) : (
                  day(value)
                ),
            },
            {
              title: m.columns.total,
              dataIndex: "total",
              align: "right",
              render: (value: number, row) => `${baht(value)} ${row.currency}`,
            },
            {
              title: m.columns.paid,
              dataIndex: "paid",
              align: "right",
              render: baht,
            },
            {
              title: m.columns.outstanding,
              dataIndex: "outstanding",
              align: "right",
              render: baht,
            },
            {
              title: m.columns.status,
              dataIndex: "status",
              render: (value: InvoiceRow["status"], row) =>
                row.overdue ? (
                  <Tag color="red">{m.overdueTag}</Tag>
                ) : (
                  <Tag color={m.statusColor[value]}>{m.status[value]}</Tag>
                ),
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}
      <Text type="secondary" className="block text-xs">
        {m.note}
      </Text>
    </div>
  );
}
