"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Checkbox, Input, Pagination, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { QuotationRow } from "@/lib/api/types";

const m = messages.sales.quotations;

/** margin ถูกลบออกจาก response เมื่อผู้ดูไม่มีสิทธิ์เห็นต้นทุน — undefined ≠ 0. */
export function formatMargin(marginPct: QuotationRow["marginPct"]): string {
  if (marginPct === undefined || marginPct === null) return m.marginHidden;
  return `${Number(marginPct).toFixed(2)}%`;
}

export function QuotationStatusTags({
  row,
}: {
  row: Pick<QuotationRow, "status" | "expired">;
}) {
  return (
    <Space size={4} wrap>
      <Tag color={m.statusColor[row.status]}>{m.status[row.status] ?? row.status}</Tag>
      {row.expired && <Tag color="red">{m.expiredTag}</Tag>}
    </Space>
  );
}

/** ทะเบียนใบเสนอราคา (CD-76) — ตัวกรองอยู่ใน URL; สร้างใบใหม่จากหน้าโอกาสการขาย. */
export function QuotationList({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: QuotationRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    status?: string;
    mineOnly: boolean;
    showSuperseded: boolean;
  };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search ?? "");

  function go(next: Partial<typeof filters> & { page?: number }) {
    const merged = { ...filters, search, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.mineOnly) params.set("view", "mine");
    if (merged.showSuperseded) params.set("superseded", "1");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.quotations}?${params.toString()}`);
  }

  // Everyone without cost visibility gets rows with no margin key at all.
  const marginVisible = rows.some((row) => row.marginPct !== undefined);

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
          className="min-w-44"
          placeholder={m.filterStatus}
          value={filters.status}
          onChange={(value) => go({ status: value })}
          options={Object.entries(m.status).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Checkbox
          checked={filters.mineOnly}
          onChange={(e) => go({ mineOnly: e.target.checked })}
        >
          {m.mineOnly}
        </Checkbox>
        <Checkbox
          checked={filters.showSuperseded}
          onChange={(e) => go({ showSuperseded: e.target.checked })}
        >
          {m.showSuperseded}
        </Checkbox>
      </div>

      <Table<QuotationRow>
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 960 }}
        columns={[
          {
            title: m.columns.no,
            dataIndex: "quotationNo",
            width: 190,
            render: (no: string, row) => (
              <Link href={ROUTES.quotationDetail(row.id)}>
                {no} <Tag className="ml-1">{m.version(row.version)}</Tag>
              </Link>
            ),
          },
          { title: m.columns.title, dataIndex: "title" },
          { title: m.columns.party, dataIndex: "partyName" },
          {
            title: m.columns.opportunity,
            dataIndex: "opportunity",
            width: 150,
            render: (opportunity: QuotationRow["opportunity"]) =>
              opportunity ? (
                <Link href={ROUTES.opportunityDetail(opportunity.id)}>
                  {opportunity.opportunityCode}
                </Link>
              ) : (
                "—"
              ),
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 170,
            render: (_: string, row) => <QuotationStatusTags row={row} />,
          },
          {
            title: m.columns.netTotal,
            dataIndex: "netTotal",
            width: 140,
            align: "right" as const,
            render: (amount: QuotationRow["netTotal"], row) =>
              `${formatAmount(amount)} ${row.currency}`,
          },
          ...(marginVisible
            ? [
                {
                  title: m.columns.margin,
                  dataIndex: "marginPct",
                  width: 90,
                  align: "right" as const,
                  render: (marginPct: QuotationRow["marginPct"]) =>
                    formatMargin(marginPct),
                },
              ]
            : []),
          {
            title: m.columns.validUntil,
            dataIndex: "validUntil",
            width: 110,
            render: (at: string | null) => (at ? dayjs(at).format("D MMM YYYY") : "—"),
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
