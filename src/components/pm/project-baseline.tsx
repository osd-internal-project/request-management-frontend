"use client";

import { Empty, Table, Tabs, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import type { ProjectBaseline } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const md = messages.projects.detail;
const kinds = messages.contracts.installments.kinds;

function Lines({ items }: { readonly items: string[] }) {
  return items.length ? (
    <ul className="mb-0 list-disc pl-5">
      {items.map((item, index) => (
        <li key={index} className="whitespace-pre-line">
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <Text type="secondary">{md.none}</Text>
  );
}

/**
 * CD-175 — what was sold, as copied when the project opened: scope,
 * deliverables, BOQ with its cost, and the billing schedule. Read-only; a
 * change goes through a change request.
 */
export function ProjectBaselineView({
  baseline,
}: {
  readonly baseline: ProjectBaseline;
}) {
  const { scope, cost } = baseline;
  const costOf = new Map(cost?.lines.map((line) => [line.index, line]) ?? []);

  return (
    <Tabs
      size="small"
      items={[
        {
          key: "scope",
          label: md.tabs.scope,
          children: (
            <div className="space-y-3">
              <div>
                <Text strong>{md.inScope}</Text>
                <Lines items={scope.inScope} />
              </div>
              <div>
                <Text strong>{md.outOfScope}</Text>
                <Lines items={scope.outOfScope} />
              </div>
              {scope.assumptions.length > 0 && (
                <div>
                  <Text strong>{md.assumptions}</Text>
                  <Lines items={scope.assumptions.map((item) => item.text)} />
                </div>
              )}
            </div>
          ),
        },
        {
          key: "deliverables",
          label: `${md.tabs.deliverables} · ${scope.deliverables.length}`,
          children: scope.deliverables.length ? (
            <div className="divide-y">
              {scope.deliverables.map((item, index) => (
                <div key={index} className="py-2">
                  <div className="font-medium">{item.title}</div>
                  {item.description && (
                    <Text
                      type="secondary"
                      className="block whitespace-pre-line text-sm"
                    >
                      {item.description}
                    </Text>
                  )}
                  {item.criteria && item.criteria.length > 0 && (
                    <div className="mt-1 text-sm">
                      <Text type="secondary" className="text-xs">
                        {md.criteria}
                      </Text>
                      <Lines items={item.criteria} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={md.none} />
          ),
        },
        {
          key: "boq",
          label: `${md.tabs.boq} · ${baseline.boq.length}`,
          children: (
            <div className="space-y-2">
              <Table
                size="small"
                rowKey={(_, index) => String(index)}
                pagination={false}
                scroll={{ x: 640 }}
                dataSource={baseline.boq.map((line, index) => ({
                  ...line,
                  index,
                }))}
                locale={{ emptyText: md.none }}
                columns={[
                  {
                    title: md.boqColumns.code,
                    dataIndex: "productCode",
                    width: 130,
                  },
                  {
                    title: md.boqColumns.name,
                    key: "name",
                    render: (_: unknown, line) => (
                      <div>
                        {line.name}
                        {line.model && (
                          <Text type="secondary" className="block text-xs">
                            {line.model}
                          </Text>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: md.boqColumns.quantity,
                    key: "quantity",
                    align: "right",
                    width: 110,
                    render: (_: unknown, line) =>
                      `${line.quantity.toLocaleString("th-TH")} ${line.unit}`,
                  },
                  {
                    title: md.boqColumns.unitCost,
                    key: "unitCost",
                    align: "right",
                    width: 130,
                    render: (_: unknown, line) => {
                      const unit = costOf.get(line.index)?.unitCost ?? null;
                      return unit === null ? (
                        <Tag color="orange">{md.noCost}</Tag>
                      ) : (
                        formatAmount(unit)
                      );
                    },
                  },
                  {
                    title: md.boqColumns.total,
                    key: "total",
                    align: "right",
                    width: 130,
                    render: (_: unknown, line) => {
                      const unit = costOf.get(line.index)?.unitCost ?? null;
                      return unit === null
                        ? "—"
                        : formatAmount(unit * line.quantity);
                    },
                  },
                ]}
              />
              {cost && (
                <div className="flex flex-wrap justify-end gap-4 text-sm">
                  <span>
                    {md.materials}: {formatAmount(cost.materialsTotal)}
                  </span>
                  <span>
                    {md.labor}: {formatAmount(cost.laborTotal)}
                  </span>
                  <span className="font-medium">
                    {md.costTotal}: {formatAmount(cost.total)}
                  </span>
                </div>
              )}
            </div>
          ),
        },
        {
          key: "installments",
          label: `${md.tabs.installments} · ${baseline.installments.length}`,
          children: (
            <Table
              size="small"
              rowKey="seq"
              pagination={false}
              scroll={{ x: 600 }}
              dataSource={baseline.installments}
              locale={{ emptyText: md.none }}
              columns={[
                {
                  title: md.installmentColumns.seq,
                  dataIndex: "seq",
                  width: 60,
                },
                {
                  title: md.installmentColumns.label,
                  key: "label",
                  render: (_: unknown, row) => (
                    <span>
                      {row.label}{" "}
                      {kinds[row.kind] && <Tag>{kinds[row.kind]}</Tag>}
                    </span>
                  ),
                },
                {
                  title: md.installmentColumns.amount,
                  key: "amount",
                  align: "right",
                  width: 130,
                  render: (_: unknown, row) => formatAmount(row.amount),
                },
                {
                  title: md.installmentColumns.due,
                  key: "due",
                  width: 150,
                  render: (_: unknown, row) =>
                    row.dueOn
                      ? dayjs(row.dueOn).format("D MMM YYYY")
                      : (row.dueNote ?? "—"),
                },
                {
                  title: md.installmentColumns.milestone,
                  key: "milestone",
                  width: 160,
                  render: (_: unknown, row) => row.milestone ?? "—",
                },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
