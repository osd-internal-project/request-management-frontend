"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Checkbox, DatePicker, Input, Select, Table, Tag } from "antd";
import { LockOutlined, PaperClipOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { ContractForm } from "@/components/legal/contract-form";
import type { ContractFilters, ContractRow } from "@/lib/api/contracts";
import type { Paginated } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts;

/**
 * CD-161 — คลังสัญญา: search by number, party, kind, status, end date — and
 * by words inside the attached PDFs. Filters live in the URL so a search can
 * be shared and survives a refresh.
 */
export function ContractList({
  result,
  filters,
  canManage,
}: {
  readonly result: Paginated<ContractRow>;
  readonly filters: ContractFilters;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const today = dayjs().startOf("day");

  function navigate(next: Partial<ContractFilters>) {
    const merged = { ...filters, ...next };
    if (!("page" in next)) delete merged.page;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.push(`${ROUTES.contracts}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          className="max-w-xs"
          allowClear
          defaultValue={filters.search}
          placeholder={m.searchPlaceholder}
          onSearch={(search) => navigate({ search: search || undefined })}
        />
        <Input.Search
          className="max-w-xs"
          allowClear
          defaultValue={filters.text}
          placeholder={m.textPlaceholder}
          onSearch={(text) => navigate({ text: text || undefined })}
        />
        <Select
          className="min-w-40"
          allowClear
          placeholder={m.allKinds}
          value={filters.kind}
          onChange={(kind?: string) => navigate({ kind })}
          options={Object.entries(m.kind).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          className="min-w-32"
          allowClear
          placeholder={m.allStatuses}
          value={filters.status}
          onChange={(status?: string) => navigate({ status })}
          options={Object.entries(m.status).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          placeholder={[m.endsBetween, ""]}
          value={[
            filters.ends_from ? dayjs(filters.ends_from) : null,
            filters.ends_to ? dayjs(filters.ends_to) : null,
          ]}
          onChange={(range) =>
            navigate({
              ends_from: range?.[0]?.format("YYYY-MM-DD"),
              ends_to: range?.[1]?.format("YYYY-MM-DD"),
            })
          }
        />
        <Checkbox
          checked={filters.confidential === "true"}
          onChange={(event) =>
            navigate({
              confidential: event.target.checked ? "true" : undefined,
            })
          }
        >
          {m.onlyConfidential}
        </Checkbox>
        {canManage && (
          <Button
            type="primary"
            className="ml-auto"
            onClick={() => setCreating(true)}
          >
            {m.create}
          </Button>
        )}
      </div>

      <Text type="secondary" className="block text-xs">
        {m.found(result.total)}
      </Text>

      <Table<ContractRow>
        size="small"
        rowKey="id"
        dataSource={result.data}
        scroll={{ x: 960 }}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: result.page,
          pageSize: result.page_size,
          total: result.total,
          hideOnSinglePage: true,
          showSizeChanger: false,
          onChange: (page) => navigate({ page: String(page) }),
        }}
        columns={[
          {
            title: m.columns.contract,
            key: "contract",
            width: 280,
            render: (_: unknown, row) => (
              <div>
                <Link href={ROUTES.contractDetail(row.id)}>
                  {row.contractNo}
                </Link>
                {row.confidential && (
                  <Tag color="red" className="ml-1!" icon={<LockOutlined />}>
                    {m.confidential}
                  </Tag>
                )}
                <Text className="block text-xs">{row.title}</Text>
                {row.master && (
                  <Text type="secondary" className="block text-xs">
                    {m.underMaster(row.master.contractNo)}
                  </Text>
                )}
              </div>
            ),
          },
          {
            title: m.columns.party,
            key: "party",
            width: 220,
            render: (_: unknown, row) =>
              row.customer ? (
                <Link href={ROUTES.customerDetail(row.customer.id)}>
                  {row.customer.customerCode} · {row.customer.nameTh}
                </Link>
              ) : (
                <span>{row.counterpartyName}</span>
              ),
          },
          {
            title: m.columns.kind,
            key: "kind",
            width: 150,
            render: (_: unknown, row) => (
              <Tag color={m.kindColor[row.kind]}>{m.kind[row.kind]}</Tag>
            ),
          },
          {
            title: m.columns.period,
            key: "period",
            width: 190,
            render: (_: unknown, row) => {
              const days = dayjs(row.endOn).startOf("day").diff(today, "day");
              return (
                <div>
                  {row.startOn
                    ? `${dayjs(row.startOn).format("D MMM YY")} – `
                    : ""}
                  {dayjs(row.endOn).format("D MMM YY")}
                  {row.status === "active" && (
                    <Text
                      type={days <= 30 ? "warning" : "secondary"}
                      className="block text-xs"
                    >
                      {m.daysLeft(days)}
                    </Text>
                  )}
                </div>
              );
            },
          },
          {
            title: m.columns.value,
            key: "value",
            width: 130,
            align: "right",
            render: (_: unknown, row) =>
              row.value === null ? "—" : formatAmount(row.value),
          },
          {
            title: m.columns.status,
            key: "status",
            width: 110,
            render: (_: unknown, row) => (
              <Tag color={m.statusColor[row.status]}>
                {m.status[row.status]}
              </Tag>
            ),
          },
          {
            title: m.columns.files,
            key: "files",
            width: 70,
            align: "center",
            render: (_: unknown, row) =>
              row._count.documents ? (
                <span>
                  <PaperClipOutlined /> {row._count.documents}
                </span>
              ) : (
                "—"
              ),
          },
        ]}
      />

      {creating && <ContractForm open onClose={() => setCreating(false)} />}
    </div>
  );
}
