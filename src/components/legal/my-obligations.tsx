"use client";

import Link from "next/link";
import { Empty, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { ObligationDoneButton } from "@/components/legal/obligation-done-button";
import type { MyObligation } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.obligations;

/** CD-163 — ข้อผูกพันของฉัน: open first, soonest first; done ones for 30 days. */
export function MyObligations({ rows }: { readonly rows: MyObligation[] }) {
  const today = dayjs().startOf("day");
  if (!rows.length) {
    return <Empty description={m.mineEmpty} />;
  }
  return (
    <Table<MyObligation>
      size="small"
      rowKey="id"
      dataSource={rows}
      pagination={false}
      scroll={{ x: 760 }}
      columns={[
        {
          title: m.itemTitle,
          key: "title",
          render: (_: unknown, row) => (
            <div>
              <span className={row.status === "open" ? "font-medium" : ""}>
                {row.title}
              </span>
              {row.clause && (
                <Text type="secondary" className="ml-2 text-xs">
                  {row.clause}
                </Text>
              )}
              {row.detail && (
                <Text type="secondary" className="block text-xs">
                  {row.detail}
                </Text>
              )}
            </div>
          ),
        },
        {
          title: m.contract,
          key: "contract",
          width: 260,
          render: (_: unknown, row) => {
            const label = `${row.contract.contractNo} · ${row.contract.title}`;
            const party =
              row.contract.customer?.nameTh ?? row.contract.counterpartyName;
            return (
              <div>
                {row.contractOpenable ? (
                  <Link href={ROUTES.contractDetail(row.contract.id)}>
                    {label}
                  </Link>
                ) : (
                  <span>{label}</span>
                )}
                {party && (
                  <Text type="secondary" className="block text-xs">
                    {party}
                  </Text>
                )}
              </div>
            );
          },
        },
        {
          title: m.dueOn,
          key: "due",
          width: 150,
          render: (_: unknown, row) => {
            if (!row.dueOn) return <Text type="secondary">{m.noDue}</Text>;
            const overdue =
              row.status === "open" && dayjs(row.dueOn).isBefore(today);
            return (
              <span className={overdue ? "text-red-500" : undefined}>
                {dayjs(row.dueOn).format("D MMM YYYY")}
                {overdue ? ` · ${m.overdue}` : ""}
              </span>
            );
          },
        },
        {
          key: "status",
          width: 140,
          align: "right",
          render: (_: unknown, row) =>
            row.status === "open" ? (
              <ObligationDoneButton obligation={row} />
            ) : (
              <Tag color={m.statusColor[row.status]}>
                {m.status[row.status]}
              </Tag>
            ),
        },
      ]}
    />
  );
}
