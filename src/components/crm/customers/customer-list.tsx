"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  type TableColumnsType,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import {
  CUSTOMER_FIELD_FILTERS,
  customerSortParam,
  type CustomerFieldFilter,
  type CustomerSort,
  type CustomerSortField,
} from "@/lib/api/customers/filters";
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
  /** ค้นหาเพิ่มเติม — each one narrows the list further. */
  fields?: Partial<Record<CustomerFieldFilter, string>>;
}

type FieldValues = Partial<Record<CustomerFieldFilter, string>>;
type Option = { value: string; label: string };

/** The text boxes of ค้นหาเพิ่มเติม, in screen order. */
const TEXT_FIELDS: {
  key: Exclude<CustomerFieldFilter, "head_office_id">;
  label: string;
  maxLength: number;
}[] = [
  {
    key: "customer_code",
    label: messages.customers.advanced.customerCode,
    maxLength: 64,
  },
  { key: "name", label: messages.customers.advanced.name, maxLength: 255 },
  {
    key: "branch_code",
    label: messages.customers.advanced.branchCode,
    maxLength: 5,
  },
  {
    key: "branch_name",
    label: messages.customers.advanced.branchName,
    maxLength: 255,
  },
  { key: "tax_id", label: messages.customers.advanced.taxId, maxLength: 13 },
  {
    key: "external_code",
    label: messages.customers.advanced.externalCode,
    maxLength: 64,
  },
];

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
  sort,
  headOffice,
}: {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  segmentOptions: SegmentOption[];
  filters: CustomerFilters;
  /** The order the server applied; none = newest first. */
  sort?: CustomerSort;
  /** The head office named by `fields.head_office_id`, for the picker's label. */
  headOffice?: { id: string; label: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applied = filters.fields ?? {};
  const appliedCount = CUSTOMER_FIELD_FILTERS.filter(
    (key) => applied[key],
  ).length;
  const [advancedOpen, setAdvancedOpen] = useState(appliedCount > 0);
  const [draft, setDraft] = useState<FieldValues>(applied);
  const [headOfficeOptions, setHeadOfficeOptions] = useState<Option[]>(
    headOffice ? [{ value: headOffice.id, label: headOffice.label }] : [],
  );

  /** Head offices only (customers that have branches), searched on the server. */
  async function searchHeadOffices(text: string) {
    if (text.trim().length < 2) return;
    const result = await appApi<{
      data: { id: string; customerCode: string; nameTh: string }[];
    }>(
      `customers?search=${encodeURIComponent(text.trim())}&has_branches=true&page_size=20`,
    );
    if (!result.ok) return;
    setHeadOfficeOptions(
      result.data.data.map((row) => ({
        value: row.id,
        label: `${row.customerCode} · ${row.nameTh}`,
      })),
    );
  }

  /** ค้นหาเพิ่มเติม replaces all its fields at once and goes back to page 1. */
  function applyFields(next: FieldValues) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of CUSTOMER_FIELD_FILTERS) {
      const value = next[key]?.trim();
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function apply(next: Partial<CustomerFilters & { page?: number }>) {
    const params = new URLSearchParams(searchParams.toString());

    const entries: [string, string | undefined][] = [
      ["search", next.search ?? filters.search],
      ["status", next.status ?? filters.status],
      ["segment_value_id", next.segmentValueId ?? filters.segmentValueId],
      ["view", (next.mineOnly ?? filters.mineOnly) ? "mine" : undefined],
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

  /**
   * Ordering is the server's, like the filters: sorting the fetched page in the
   * browser would order 50 rows of a register that runs to thousands.
   */
  function applySort(next?: CustomerSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("sort", customerSortParam(next));
    else params.delete("sort");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  /** `sorter: true` = the header is clickable, the ordering is not antd's. */
  function sortable(field: CustomerSortField) {
    return {
      key: field,
      sorter: true,
      sortOrder:
        sort?.field === field
          ? sort.descending
            ? ("descend" as const)
            : ("ascend" as const)
          : null,
    };
  }

  const columns: TableColumnsType<CustomerRow> = [
    {
      title: messages.customers.columns.code,
      dataIndex: "customerCode",
      ...sortable("customerCode"),
      render: (code: string, row: CustomerRow) => (
        <Link href={ROUTES.customerDetail(row.id)}>{code}</Link>
      ),
    },
    {
      title: messages.customers.columns.name,
      dataIndex: "nameTh",
      ...sortable("nameTh"),
      render: (nameTh: string, row: CustomerRow) => (
        <div>
          <div>{nameTh}</div>
          <Text type="secondary" className="text-xs">
            {messages.customers.type[row.type]}
            {row.nameEn ? ` · ${row.nameEn}` : ""}
          </Text>
        </div>
      ),
    },
    {
      title: messages.customers.columns.branchCode,
      dataIndex: "branchCode",
      ...sortable("branchCode"),
      render: (branchCode: string) => (
        <span className="whitespace-nowrap">{branchCode}</span>
      ),
    },
    {
      title: messages.customers.columns.branchName,
      dataIndex: "branchName",
      ...sortable("branchName"),
      render: (branchName: string | null | undefined) =>
        branchName ?? <Text type="secondary">—</Text>,
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
      ...sortable("status"),
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
      ...sortable("updatedAt"),
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
          onChange={(value) =>
            apply({ status: (value as string) || undefined })
          }
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
        <Badge count={appliedCount} size="small">
          <Button onClick={() => setAdvancedOpen((open) => !open)}>
            {messages.customers.advanced.toggle}
          </Button>
        </Badge>
      </Space>

      {advancedOpen && (
        <Form
          layout="vertical"
          className="rounded-md border border-gray-200 p-3"
          onFinish={() => applyFields(draft)}
        >
          <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2 xl:grid-cols-4">
            <Form.Item
              label={messages.customers.advanced.headOffice}
              extra={messages.customers.advanced.headOfficeHint}
              className="mb-3! md:col-span-2"
            >
              <Select
                allowClear
                showSearch
                filterOption={false}
                value={draft.head_office_id}
                placeholder={messages.customers.advanced.headOfficePlaceholder}
                options={headOfficeOptions}
                onSearch={(text) => void searchHeadOffices(text)}
                onChange={(value: string | undefined) =>
                  setDraft((current) => ({ ...current, head_office_id: value }))
                }
              />
            </Form.Item>
            {TEXT_FIELDS.map((field) => (
              <Form.Item key={field.key} label={field.label} className="mb-3!">
                <Input
                  allowClear
                  maxLength={field.maxLength}
                  value={draft[field.key] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </Form.Item>
            ))}
          </div>
          <Space>
            <Button type="primary" htmlType="submit">
              {messages.customers.advanced.apply}
            </Button>
            <Button
              onClick={() => {
                setDraft({});
                applyFields({});
              }}
            >
              {messages.customers.advanced.clear}
            </Button>
          </Space>
        </Form>
      )}

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
        onChange={(_pagination, _filters, sorter, extra) => {
          // Paging has its own handler; this one would otherwise reset it.
          if (extra.action !== "sort") return;
          const picked = Array.isArray(sorter) ? sorter[0] : sorter;
          applySort(
            picked?.order
              ? {
                  field: picked.columnKey as CustomerSortField,
                  descending: picked.order === "descend",
                }
              : undefined,
          );
        }}
        size="middle"
      />
    </div>
  );
}
