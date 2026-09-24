"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Checkbox, Input, Pagination, Select, Table, Tag } from "antd";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import {
  saleOrderErpColumn,
  saleOrderExpandable,
} from "@/components/crm/sale-orders/sale-order-parts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { SaleOrderRow } from "@/lib/api/types";

const m = messages.sales.saleOrders;
const md = messages.sales.opportunities.detail;
const mq = messages.sales.quotations;

export interface SaleOrderListFilters {
  search?: string;
  status?: string;
  erpStatus?: string;
  mineOnly: boolean;
}

/**
 * CD-88 — ทะเบียนใบสั่งขายทุกใบในขอบเขตที่เห็น พร้อมสถานะส่ง SAP. ตัวกรองอยู่ใน
 * URL (เหมือนหน้าใบเสนอราคา) ให้ลิงก์ไปที่ "ส่งไม่สำเร็จ" แชร์กันได้. กางแถวดู
 * รายการสินค้า; เปิดใบใหม่ยังทำจากหน้าโอกาสการขาย.
 */
export function SaleOrderList({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: SaleOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: SaleOrderListFilters;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search ?? "");

  function go(next: Partial<SaleOrderListFilters> & { page?: number }) {
    const merged = { ...filters, search, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.erpStatus) params.set("erp_status", merged.erpStatus);
    if (merged.mineOnly) params.set("view", "mine");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.saleOrders}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          allowClear
          className="max-w-80"
          placeholder={m.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => go({ search: value })}
        />
        <Select
          allowClear
          className="min-w-40"
          placeholder={m.filterStatus}
          value={filters.status}
          onChange={(value) => go({ status: value })}
          options={Object.entries(md.saleOrderStatus).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          allowClear
          className="min-w-44"
          placeholder={m.filterErp}
          value={filters.erpStatus}
          onChange={(value) => go({ erpStatus: value })}
          options={Object.entries(md.saleOrderErpStatus).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Checkbox checked={filters.mineOnly} onChange={(e) => go({ mineOnly: e.target.checked })}>
          {m.mineOnly}
        </Checkbox>
      </div>

      <Table<SaleOrderRow>
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        expandable={saleOrderExpandable}
        scroll={{ x: 1100 }}
        columns={[
          { title: m.columns.code, dataIndex: "saleOrderCode", width: 160 },
          {
            title: m.columns.customer,
            dataIndex: "customer",
            render: (customer: SaleOrderRow["customer"]) =>
              customer ? (
                <Link href={ROUTES.customerDetail(customer.id)}>
                  {customer.customerCode} · {customer.nameTh}
                </Link>
              ) : (
                "—"
              ),
          },
          {
            title: m.columns.opportunity,
            dataIndex: "opportunity",
            width: 150,
            render: (opportunity: SaleOrderRow["opportunity"]) =>
              opportunity ? (
                <Link href={ROUTES.opportunityDetail(opportunity.id)}>
                  {opportunity.opportunityCode}
                </Link>
              ) : (
                "—"
              ),
          },
          {
            title: m.columns.quotation,
            dataIndex: "quotation",
            width: 170,
            render: (quotation: SaleOrderRow["quotation"]) =>
              quotation ? (
                <Link href={ROUTES.quotationDetail(quotation.id)}>
                  {quotation.quotationNo} <Tag className="ml-1">{mq.version(quotation.version)}</Tag>
                </Link>
              ) : (
                "—"
              ),
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 100,
            render: (status: string) => (
              <Tag color={status === "open" ? "green" : "red"}>
                {md.saleOrderStatus[status] ?? status}
              </Tag>
            ),
          },
          saleOrderErpColumn,
          {
            title: m.columns.amount,
            dataIndex: "amount",
            width: 140,
            align: "right" as const,
            render: (amount: SaleOrderRow["amount"], row) =>
              `${formatAmount(amount)} ${row.currency}`,
          },
          {
            title: m.columns.orderedAt,
            dataIndex: "orderedAt",
            width: 110,
            render: (at: string) => dayjs(at).format("D MMM YYYY"),
          },
        ]}
      />

      {total > pageSize && (
        <Pagination
          align="end"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          onChange={(next) => go({ page: next })}
        />
      )}
    </div>
  );
}
