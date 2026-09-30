"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Input, Select, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import type { ProjectFilters, ProjectRow } from "@/lib/api/projects";
import type { Paginated } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects;

/**
 * CD-175 — โครงการ: every project of the company for `pm.project.read`, the
 * ones I run or am on otherwise. Filters live in the URL.
 */
export function ProjectList({
  result,
  filters,
  canOpen,
}: {
  readonly result: Paginated<ProjectRow>;
  readonly filters: ProjectFilters;
  readonly canOpen: boolean;
}) {
  const router = useRouter();

  function navigate(next: Partial<ProjectFilters>) {
    const merged = { ...filters, ...next };
    if (!("page" in next)) delete merged.page;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.push(`${ROUTES.projects}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          className="max-w-xs"
          allowClear
          defaultValue={filters.q}
          placeholder={m.search}
          onSearch={(q) => navigate({ q: q || undefined })}
        />
        <Select
          className="min-w-32"
          allowClear
          placeholder={m.all}
          value={filters.status}
          onChange={(status?: string) => navigate({ status })}
          options={Object.entries(m.status).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Checkbox
          checked={filters.scope === "mine"}
          onChange={(event) =>
            navigate({ scope: event.target.checked ? "mine" : undefined })
          }
        >
          {m.mine}
        </Checkbox>
        {canOpen && (
          <Link href={ROUTES.projectOpen()} className="ml-auto">
            <Button type="primary">{m.open}</Button>
          </Link>
        )}
      </div>

      <Table<ProjectRow>
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
            title: m.columns.name,
            key: "name",
            width: 280,
            render: (_: unknown, row) => (
              <div>
                <Link href={ROUTES.projectDetail(row.id)}>{row.projectNo}</Link>
                <Text className="block text-xs">{row.name}</Text>
                <Text type="secondary" className="block text-xs">
                  {row.contract.contractNo}
                </Text>
              </div>
            ),
          },
          {
            title: m.columns.party,
            key: "party",
            width: 200,
            render: (_: unknown, row) =>
              row.contract.customer
                ? `${row.contract.customer.customerCode} · ${row.contract.customer.nameTh}`
                : (row.contract.counterpartyName ?? "—"),
          },
          {
            title: m.columns.manager,
            key: "manager",
            width: 150,
            render: (_: unknown, row) => row.managerName ?? "—",
          },
          {
            title: m.columns.period,
            key: "period",
            width: 180,
            render: (_: unknown, row) =>
              `${row.startOn ? `${dayjs(row.startOn).format("D MMM YY")} – ` : ""}${dayjs(row.endOn).format("D MMM YY")}`,
          },
          {
            title: m.columns.value,
            key: "value",
            align: "right",
            width: 130,
            render: (_: unknown, row) => formatAmount(row.contractValue),
          },
          {
            title: m.columns.team,
            key: "team",
            align: "right",
            width: 70,
            render: (_: unknown, row) => row._count.members + 1,
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
        ]}
      />
    </div>
  );
}
