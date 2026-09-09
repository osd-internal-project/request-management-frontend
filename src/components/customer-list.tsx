"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Checkbox, Empty, Input, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { CustomerRow, SegmentOption } from "@/lib/api/types";

/** Shared with the 360° header card once it exists. */
export const CUSTOMER_STATUS_COLOR: Record<string, string> = {
  draft: "default",
  active: "green",
  suspended: "orange",
  inactive: "default",
};

export interface CustomerFilters {
  search?: string;
  status?: string;
  segmentValueId?: string;
  mineOnly?: boolean;
}

/**
 * The register table (CM-01) — filters are URL parameters the server applies,
 * for the same reason as "งานค้างของฉัน": the register runs past one page, and
 * narrowing a fetched page in the browser reports "not found" for matches on
 * the next one.
 */
export function CustomerList({
  rows,
  total,
  page,
  pageSize,
  segmentOptions,
  filters,
}: {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  segmentOptions: SegmentOption[];
  filters: CustomerFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(next: Partial<CustomerFilters & { page?: number }>) {
    const params = new URLSearchParams(searchParams.toString());

    const entries: [string, string | undefined][] = [
      ["search", next.search ?? filters.search],
      ["status", next.status ?? filters.status],
      ["segment_value_id", next.segmentValueId ?? filters.segmentValueId],
      [
        "view",
        (next.mineOnly ?? filters.mineOnly) ? "mine" : undefined,
      ],
      // Any filter change goes back to page 1 — page 3 of a different query
      // is nobody's intention.
      ["page", next.page ? String(next.page) : undefined],
    ];

    for (const [key, value] of entries) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  const columns = [
    {
      title: messages.customers.columns.code,
      dataIndex: "customerCode",
      render: (code: string, row: CustomerRow) => (
        <Link href={ROUTES.customerDetail(row.id)}>{code}</Link>
      ),
    },
    {
      title: messages.customers.columns.name,
      dataIndex: "nameTh",
      render: (nameTh: string, row: CustomerRow) => (
        <div>
          <div>
            {nameTh}
            {row.branchCode !== "00000" && (
              <Tag className="ml-2">
                {`${messages.customers.detail.branch} ${row.branchCode}`}
                {row.branchName ? ` · ${row.branchName}` : ""}
              </Tag>
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {messages.customers.type[row.type]}
            {row.nameEn ? ` · ${row.nameEn}` : ""}
          </Text>
        </div>
      ),
    },
    {
      title: messages.customers.columns.taxId,
      dataIndex: "taxId",
      // Absent when masked (CM-08) — the interceptor deletes the field, so a
      // dash is the only honest render for both "none" and "not yours to see".
      render: (taxId: string | null | undefined) =>
        taxId ? <span>{taxId}</span> : <Text type="secondary">—</Text>,
    },
    {
      title: messages.customers.columns.segments,
      dataIndex: "segments",
      render: (segments: CustomerRow["segments"]) =>
        segments.length ? (
          <Space size={4} wrap>
            {segments.map((assignment) => (
              <Tag key={assignment.value.id}>
                {assignment.value.dimension.nameTh}: {assignment.value.nameTh}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: messages.customers.columns.owner,
      dataIndex: ["accountOwner", "displayName"],
      render: (name: string | undefined) =>
        name ?? <Text type="secondary">—</Text>,
    },
    {
      title: messages.customers.columns.status,
      dataIndex: "status",
      render: (status: string, row: CustomerRow) => (
        <Space size={4}>
          <Tag color={CUSTOMER_STATUS_COLOR[status]}>
            {messages.customers.status[status] ?? status}
          </Tag>
          {row.kycVerified && (
            <Tag color="blue">{messages.customers.kycVerified}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: messages.customers.columns.updatedAt,
      dataIndex: "updatedAt",
      render: (value: string) => (
        <Text type="secondary" className="text-xs">
          {new Date(value).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })}
        </Text>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Space wrap>
        <Input.Search
          allowClear
          defaultValue={filters.search}
          placeholder={messages.customers.searchPlaceholder}
          onSearch={(value) => apply({ search: value || undefined })}
          className="w-72"
        />
        <SearchSelect
          allowClear
          value={filters.status}
          placeholder={messages.customers.filterStatus}
          onChange={(value) => apply({ status: (value as string) || undefined })}
          options={Object.entries(messages.customers.status).map(
            ([value, label]) => ({ value, label }),
          )}
          className="min-w-40"
        />
        <SearchSelect
          allowClear
          value={filters.segmentValueId}
          placeholder={messages.customers.filterSegment}
          onChange={(value) =>
            apply({ segmentValueId: (value as string) || undefined })
          }
          options={segmentOptions.map((option) => ({
            value: option.id,
            label: `${option.dimension.nameTh}: ${option.nameTh}`,
          }))}
          className="min-w-48"
        />
        <Checkbox
          checked={filters.mineOnly}
          onChange={(event) => apply({ mineOnly: event.target.checked })}
        >
          {messages.customers.viewMineOnly}
        </Checkbox>
      </Space>

      <Table<CustomerRow>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={messages.customers.empty}
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (nextPage) => apply({ page: nextPage }),
        }}
        size="middle"
      />
    </div>
  );
}
