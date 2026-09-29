"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Card, Input, Segmented, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { HealthTag } from "@/components/crm/keeper/health-tag";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { SearchSelect } from "@/components/ui/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { Portfolio, PortfolioRow } from "@/lib/api/types";

const m = messages.keeper;

interface Filters {
  view: "mine" | "team";
  tier?: string;
  health?: string;
  search?: string;
}

/**
 * CD-86 — the Keeper's book: tiles that filter, then one row per account,
 * riskiest first. A row opens the customer on its account-plan tab.
 */
export function PortfolioView({
  portfolio,
  filters,
}: {
  portfolio: Portfolio;
  filters: Filters;
}) {
  const router = useRouter();
  const today = dayjs().startOf("day");

  function navigate(next: Partial<Filters>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.view === "team") params.set("view", "team");
    if (merged.tier) params.set("tier", merged.tier);
    if (merged.health) params.set("health", merged.health);
    if (merged.search) params.set("search", merged.search);
    router.push(`${ROUTES.keeper}?${params.toString()}`);
  }

  const s = portfolio.summary;
  const tiles: {
    key: string;
    label: string;
    value: number;
    color: string;
    onClick?: () => void;
    active?: boolean;
  }[] = [
    {
      key: "red",
      label: m.tiles.red,
      value: s.red,
      color: "text-red-600",
      onClick: () =>
        navigate({ health: filters.health === "red" ? undefined : "red" }),
      active: filters.health === "red",
    },
    {
      key: "amber",
      label: m.tiles.amber,
      value: s.amber,
      color: "text-orange-500",
      onClick: () =>
        navigate({ health: filters.health === "amber" ? undefined : "amber" }),
      active: filters.health === "amber",
    },
    {
      key: "green",
      label: m.tiles.green,
      value: s.green,
      color: "text-green-600",
      onClick: () =>
        navigate({ health: filters.health === "green" ? undefined : "green" }),
      active: filters.health === "green",
    },
    {
      key: "reviews",
      label: m.tiles.reviewsDue,
      value: s.reviews_due,
      color: "text-blue-600",
    },
    {
      key: "noplan",
      label: m.tiles.withoutPlan,
      value: s.without_plan,
      color: "text-gray-600",
      onClick: () =>
        navigate({ tier: filters.tier === "none" ? undefined : "none" }),
      active: filters.tier === "none",
    },
    {
      key: "noexp",
      label: m.tiles.noExpansion,
      value: s.no_expansion,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <Card
            key={tile.key}
            size="small"
            hoverable={Boolean(tile.onClick)}
            onClick={tile.onClick}
            className={tile.active ? "border-blue-500!" : undefined}
          >
            <div className={`text-2xl font-semibold ${tile.color}`}>
              {tile.value}
            </div>
            <Text type="secondary" className="text-xs">
              {tile.label}
            </Text>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<"mine" | "team">
          value={filters.view}
          onChange={(view) => navigate({ view })}
          options={[
            { value: "mine", label: m.mine },
            { value: "team", label: m.team },
          ]}
        />
        <Input.Search
          className="max-w-xs"
          defaultValue={filters.search}
          placeholder={m.searchPlaceholder}
          allowClear
          onSearch={(value) => navigate({ search: value || undefined })}
        />
        <SearchSelect
          className="min-w-36"
          allowClear
          placeholder={m.allTiers}
          value={filters.tier}
          onChange={(value) =>
            navigate({ tier: (value as string) || undefined })
          }
          options={[
            ...Object.entries(m.tier).map(([value, label]) => ({
              value,
              label,
            })),
            { value: "none", label: m.noPlanFilter },
          ]}
        />
        <SearchSelect
          className="min-w-36"
          allowClear
          placeholder={m.allHealth}
          value={filters.health}
          onChange={(value) =>
            navigate({ health: (value as string) || undefined })
          }
          options={Object.entries(m.health).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {portfolio.truncated && (
        <Alert type="info" showIcon title={m.truncated} />
      )}

      <Table<PortfolioRow>
        size="small"
        rowKey="id"
        dataSource={portfolio.rows}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: m.empty }}
        columns={[
          {
            title: m.columns.health,
            key: "health",
            width: 110,
            render: (_: unknown, row) => <HealthTag health={row.health} />,
          },
          {
            title: m.columns.customer,
            key: "customer",
            width: 260,
            render: (_: unknown, row) => (
              <div>
                <Link href={`${ROUTES.customerDetail(row.id)}?tab=account`}>
                  {row.name_th}
                </Link>
                <Text type="secondary" className="block text-xs">
                  {row.customer_code}
                  {row.branch_name ? ` · ${row.branch_name}` : ""}
                </Text>
                {row.health.signals[0] && (
                  <Text type="secondary" className="block text-xs">
                    {m.signal[row.health.signals[0].code]?.(
                      row.health.signals[0].values,
                    )}
                    {row.health.signals.length > 1
                      ? ` +${row.health.signals.length - 1}`
                      : ""}
                  </Text>
                )}
              </div>
            ),
          },
          {
            title: m.columns.tier,
            key: "tier",
            width: 80,
            render: (_: unknown, row) =>
              row.plan ? (
                <Tag color={m.tierColor[row.plan.tier]}>
                  {m.tier[row.plan.tier]}
                </Tag>
              ) : (
                <Text type="secondary" className="text-xs">
                  {m.noPlan}
                </Text>
              ),
          },
          {
            title: m.columns.nextReview,
            key: "nextReview",
            width: 130,
            render: (_: unknown, row) => {
              const on = row.plan?.next_review_on;
              if (!on) return "—";
              const overdue = dayjs(on).isBefore(today);
              return (
                <span className={overdue ? "text-red-500" : undefined}>
                  {dayjs(on).format("D MMM YY")}
                  {overdue ? ` · ${m.overdueReview}` : ""}
                </span>
              );
            },
          },
          {
            title: m.columns.lastContact,
            key: "lastContact",
            width: 120,
            render: (_: unknown, row) =>
              row.last_contact_at
                ? dayjs(row.last_contact_at).format("D MMM YY")
                : m.never,
          },
          {
            title: m.columns.deals,
            key: "deals",
            width: 170,
            render: (_: unknown, row) =>
              row.open_deals ? (
                <Space size={4} wrap>
                  <span>
                    {row.open_deals.count} ·{" "}
                    {formatAmount(row.open_deals.amount)}
                  </span>
                  {row.open_deals.expansion ? (
                    <Tag color="purple">
                      {m.expansion(row.open_deals.expansion)}
                    </Tag>
                  ) : (
                    <Tag>{m.noExpansionTag}</Tag>
                  )}
                </Space>
              ) : (
                "—"
              ),
          },
          {
            title: m.columns.revenue,
            key: "revenue",
            width: 150,
            align: "right",
            render: (_: unknown, row) =>
              row.revenue_12m === null ? (
                "—"
              ) : (
                <div>
                  {formatAmount(row.revenue_12m)}
                  {row.plan?.target_revenue ? (
                    <Text type="secondary" className="block text-xs">
                      {m.account.target} {formatAmount(row.plan.target_revenue)}
                    </Text>
                  ) : null}
                </div>
              ),
          },
          {
            title: m.columns.owner,
            key: "owner",
            width: 140,
            render: (_: unknown, row) => row.owner?.displayName ?? "—",
          },
        ]}
      />
    </div>
  );
}
