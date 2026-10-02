"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Collapse, Skeleton, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import {
  listPricingExceptions,
  type PricingException,
  type PricingExceptionQuery,
} from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.pricing.exceptions;
const workTypes = messages.sales.quotations.detail.workTypes;

const KIND_COLOR: Record<string, string> = {
  margin_below: "red",
  price_override: "orange",
  discount_option: "blue",
};
const DECISION_COLOR: Record<string, string> = {
  approved: "green",
  rejected: "red",
  cancelled: "default",
  pending: "gold",
};

function workTypeLabel(value: string | null) {
  return !value || value === "none"
    ? m.noWorkType
    : (workTypes[value] ?? value);
}

function money(value: string | null) {
  return value === null
    ? "—"
    : Number(value).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

/** What was outside the policy, in one line. */
function detailOf(row: PricingException) {
  if (row.kind === "margin_below") {
    const min = row.minMarginPct ?? "—";
    return row.marginPct === undefined
      ? m.marginHidden(workTypeLabel(row.workType), min)
      : m.marginDetail(
          workTypeLabel(row.workType),
          row.marginPct === null ? "—" : `${row.marginPct}%`,
          min,
        );
  }
  if (row.kind === "price_override") {
    return m.overrideDetail(
      row.productCode ?? row.description ?? "—",
      money(row.systemPrice),
      money(row.unitPrice),
    );
  }
  return m.capsDetail(
    Object.entries(row.caps ?? {})
      .map(([key, cap]) => `${workTypeLabel(key)} ≤ ${cap}%`)
      .join(", "),
  );
}

/**
 * CD-205 — the register, for any slice of it: the whole company (the
 * register page), one customer (360°), or the same customer's other deals.
 */
export function PricingExceptionsTable({
  query,
  reloadKey = 0,
  onLoaded,
}: {
  query: PricingExceptionQuery;
  reloadKey?: number;
  onLoaded?: (rows: PricingException[]) => void;
}) {
  // Each result remembers the query it answers; a newer query shows loading
  // until its own answer arrives.
  const key = `${JSON.stringify(query)}#${reloadKey}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: PricingException[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    void listPricingExceptions(
      JSON.parse(key.slice(0, key.lastIndexOf("#"))) as PricingExceptionQuery,
    ).then((result) => {
      if (!live) return;
      if (result.ok) {
        setLoaded({ key, rows: result.data.items, error: null });
        onLoaded?.(result.data.items);
      } else {
        setLoaded({ key, rows: [], error: result.message });
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!loaded || loaded.key !== key) return <Skeleton active />;
  if (loaded.error) return <Alert type="error" showIcon title={loaded.error} />;
  const rows = loaded.rows;

  return (
    <Table<PricingException>
      rowKey="id"
      size="small"
      dataSource={rows}
      pagination={rows.length > 20 ? { pageSize: 20 } : false}
      locale={{ emptyText: m.empty }}
      scroll={{ x: 1100 }}
      columns={[
        {
          title: m.date,
          dataIndex: "createdAt",
          width: 100,
          render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
        },
        {
          title: m.kind,
          dataIndex: "kind",
          width: 150,
          render: (value: string) => (
            <Tag color={KIND_COLOR[value]}>{m.kinds[value] ?? value}</Tag>
          ),
        },
        { title: m.customer, dataIndex: "partyName", width: 180 },
        {
          title: m.quotation,
          key: "quotation",
          width: 150,
          render: (_: unknown, row) => (
            <Link href={ROUTES.quotationDetail(row.quotationId)}>
              {row.quotationNo} v{row.version}
            </Link>
          ),
        },
        {
          title: m.detail,
          key: "detail",
          width: 260,
          render: (_: unknown, row) => detailOf(row),
        },
        {
          title: m.reason,
          dataIndex: "reason",
          ellipsis: true,
          render: (value: string | null) => value ?? "—",
        },
        {
          title: m.requestedBy,
          dataIndex: "requestedByName",
          width: 130,
          render: (value: string | null) => value ?? "—",
        },
        {
          title: m.approvers,
          dataIndex: "approverNames",
          width: 150,
          render: (value: string[]) => (value.length ? value.join(", ") : "—"),
        },
        {
          title: m.decision,
          dataIndex: "decision",
          width: 100,
          render: (value: string) => (
            <Tag color={DECISION_COLOR[value]}>
              {m.decisions[value] ?? value}
            </Tag>
          ),
        },
      ]}
    />
  );
}

/**
 * CD-205 — on a deal or quotation: what this customer was allowed before, on
 * its other deals. Shows nothing for a prospect or a clean history.
 */
export function PastPricingExceptions({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    void listPricingExceptions({ for_opportunity: opportunityId }).then(
      (result) => {
        if (live && result.ok) setCount(result.data.items.length);
      },
    );
    return () => {
      live = false;
    };
  }, [opportunityId]);

  if (!count) return null;
  return (
    <Alert
      type="info"
      showIcon
      title={<Text>{m.notice(count)}</Text>}
      action={
        <Button size="small" onClick={() => setOpen(!open)}>
          {m.noticeShow}
        </Button>
      }
      description={
        open ? (
          <Collapse
            ghost
            activeKey={["list"]}
            items={[
              {
                key: "list",
                showArrow: false,
                children: (
                  <PricingExceptionsTable
                    query={{ for_opportunity: opportunityId }}
                  />
                ),
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
