"use client";

import Link from "next/link";
import { Button, Card, Empty, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type { RequestRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const contractLabels = messages.sales.opportunities.detail.contracts;

/** The card's words — contracts (CD-81) by default, solutions for CD-130. */
export interface RequestCardLabels {
  readonly title: string;
  readonly raise: string;
  readonly empty: string;
  readonly cannotRaise: string;
  readonly draftNo: string;
  readonly columns: {
    readonly no: string;
    readonly stage: string;
    readonly owner: string;
    readonly raised: string;
  };
  readonly stages: Record<string, string>;
}

/** Where the draft stands, in the words a salesperson asks with. */
const STAGE: Record<string, { color: string }> = {
  draft: { color: "default" },
  submitted: { color: "gold" },
  in_progress: { color: "blue" },
  on_hold: { color: "default" },
  returned: { color: "orange" },
  completed: { color: "cyan" },
  approved: { color: "green" },
  closed: { color: "green" },
  rejected: { color: "red" },
  cancelled: { color: "default" },
};

/**
 * CD-81 — ประสานงานสัญญา from the deal: ask Legal to draft or amend a contract
 * and follow the draft here, without opening the legal module. The requests
 * are ordinary Platform Requests of the type the CRM settings name, raised
 * with this deal as their reference.
 */
export function ContractCard({
  opportunityCode,
  typeCode,
  typeName,
  requests,
  labels: m = contractLabels,
}: {
  readonly opportunityCode: string;
  readonly typeCode: string;
  /** null = the viewer cannot raise this type (not offered to them). */
  readonly typeName: string | null;
  readonly requests: RequestRow[];
  /** CD-130 — the same card for the deal's solution requests. */
  readonly labels?: RequestCardLabels;
}) {
  const raiseHref = `${ROUTES.newRequest}?type=${encodeURIComponent(typeCode)}&ref_type=opportunity&ref_id=${encodeURIComponent(opportunityCode)}`;

  return (
    <Card
      size="small"
      title={`${m.title} · ${requests.length}`}
      extra={
        typeName ? (
          <Link href={raiseHref}>
            <Button size="small" type="primary">
              {m.raise}
            </Button>
          </Link>
        ) : null
      }
    >
      {requests.length ? (
        <Table<RequestRow>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={requests}
          columns={[
            {
              title: m.columns.no,
              dataIndex: "requestNo",
              render: (no: string | null, row) => (
                <Link href={ROUTES.requestDetail(row.id)}>
                  {no ?? m.draftNo}
                </Link>
              ),
            },
            {
              title: m.columns.stage,
              dataIndex: "status",
              render: (status: string) => (
                <Tag color={STAGE[status]?.color}>
                  {m.stages[status] ?? status}
                </Tag>
              ),
            },
            {
              title: m.columns.owner,
              key: "owner",
              render: (_: unknown, row) =>
                row.assignee?.displayName ?? row.receiver?.displayName ?? "—",
            },
            {
              title: m.columns.raised,
              dataIndex: "createdAt",
              render: (value: string) => dayjs(value).format("DD/MM/YY"),
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}
      {!typeName && (
        <Text type="secondary" className="mt-2 block text-xs">
          {m.cannotRaise}
        </Text>
      )}
    </Card>
  );
}
