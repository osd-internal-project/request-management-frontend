"use client";

import Link from "next/link";
import { Button, Card, Empty, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type { RequestRow } from "@/lib/api/types";
import type { DealSolution } from "@/lib/api/presales";
import { APPROVAL_COLOR } from "@/components/presales/solution-workspace";
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
  /** CD-132 — heading of the design column, when `designs` is given. */
  readonly design?: string;
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
  designs,
  prefillFromSolution = false,
}: {
  readonly opportunityCode: string;
  readonly typeCode: string;
  /** null = the viewer cannot raise this type (not offered to them). */
  readonly typeName: string | null;
  readonly requests: RequestRow[];
  /** CD-130 — the same card for the deal's solution requests. */
  readonly labels?: RequestCardLabels;
  /** CD-132 — the Solution Pre-Sales designed from each request, by request id. */
  readonly designs?: Record<string, DealSolution>;
  /** CD-133 — fill the new request from the deal's approved Solution. */
  readonly prefillFromSolution?: boolean;
}) {
  const raiseHref = `${ROUTES.newRequest}?type=${encodeURIComponent(typeCode)}&ref_type=opportunity&ref_id=${encodeURIComponent(opportunityCode)}${prefillFromSolution ? "&prefill=solution" : ""}`;

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
            ...(designs
              ? [
                  {
                    title: m.design,
                    key: "design",
                    render: (_: unknown, row: RequestRow) => {
                      const design = designs[row.id];
                      if (!design?.latest) return "—";
                      return (
                        <Space size={4} wrap>
                          <Link href={ROUTES.solutionDetail(design.id)}>
                            {`v${design.latest.versionNo} · ${
                              messages.presales.versionStatus[
                                design.latest.status
                              ] ?? design.latest.status
                            }`}
                          </Link>
                          {design.latest.status !== "draft" && (
                            <Tag
                              color={
                                APPROVAL_COLOR[design.latest.approvalStatus]
                              }
                            >
                              {messages.presales.approval.statuses[
                                design.latest.approvalStatus
                              ] ?? design.latest.approvalStatus}
                            </Tag>
                          )}
                          {design.pricing_ready_version !== null && (
                            <Tag color="green">
                              {messages.presales.boq.pricingReady(
                                design.pricing_ready_version,
                              )}
                            </Tag>
                          )}
                          {design.tor_counts.mandatory_gaps > 0 && (
                            <Tag color="red">
                              {messages.presales.tor.onDeal(
                                design.tor_counts.mandatory_gaps,
                              )}
                            </Tag>
                          )}
                          {(design.demo_counts.equipment_out > 0 ||
                            design.demo_counts.findings_open > 0) && (
                            <Tag color="orange">
                              {messages.presales.demos.onDeal(
                                design.demo_counts.equipment_out,
                                design.demo_counts.findings_open,
                              )}
                            </Tag>
                          )}
                          {design.risk_counts.open_high > 0 && (
                            <Tag
                              color={
                                design.risk_counts.needs_plan ? "red" : "orange"
                              }
                            >
                              {messages.presales.risks.onDeal(
                                design.risk_counts.open_high,
                                design.risk_counts.needs_plan,
                              )}
                            </Tag>
                          )}
                          {(design.clarification_counts.awaiting_answer > 0 ||
                            design.clarification_counts.scope_open > 0) && (
                            <Tag color="orange">
                              {messages.presales.clarifications.onDeal(
                                design.clarification_counts.awaiting_answer,
                                design.clarification_counts.scope_open,
                              )}
                            </Tag>
                          )}
                          {design.waiting_customer > 0 && (
                            <Tag color="orange">
                              {messages.presales.analysis.waitingOnDeal(
                                design.waiting_customer,
                              )}
                            </Tag>
                          )}
                        </Space>
                      );
                    },
                  },
                ]
              : []),
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
