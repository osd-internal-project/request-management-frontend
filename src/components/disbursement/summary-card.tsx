"use client";

import Link from "next/link";
import { Card, Descriptions, Tag, Timeline } from "antd";
import type { DisbursementDetail } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { baht, STATUS_COLOR, thaiDate, thaiDateTime } from "./format";

const m = messages.disbursement.summary;

/** The right-hand "สรุปข้อมูล" column of screens 1–7. */
export function SummaryCard({
  view,
  requesterName,
  nextActor,
}: {
  readonly view: DisbursementDetail;
  readonly requesterName: string | null;
  readonly nextActor: string | null;
}) {
  const kinds = messages.disbursement.kinds;
  const statuses = messages.disbursement.statuses;
  const steps =
    view.kind === "PETTY_CASH"
      ? messages.disbursement.pettySteps
      : messages.disbursement.steps;
  const moments: [string, string | null][] = [
    [steps[0].title, view.createdAt],
    [steps[3].title, view.verify?.at ?? null],
    [statuses.APPROVED, view.approvedAt],
    [steps[4].title, view.paidAt],
    ...(view.kind === "ADVANCE"
      ? ([[steps[5].title, view.clearingAt]] as [string, string | null][])
      : []),
    [steps[steps.length - 1].title, view.closedAt],
  ];

  return (
    <Card title={m.title}>
      <Descriptions
        column={1}
        size="small"
        items={[
          { label: m.kind, children: kinds[view.kind] },
          { label: m.docNo, children: view.docNo },
          { label: m.soNo, children: view.references.soNo ?? "-" },
          { label: m.soSubject, children: view.references.soSubject ?? "-" },
          { label: m.ticketNo, children: view.references.ticketNo ?? "-" },
          { label: m.project, children: view.references.projectCode ?? "-" },
          {
            label: m.requestNo,
            children: (
              <Link href={ROUTES.requestDetail(view.requestId)}>
                {view.requestNo ?? m.openRequest}
              </Link>
            ),
          },
          { label: m.requester, children: requesterName ?? "-" },
          { label: m.payee, children: view.payee ?? "-" },
          { label: m.costCenter, children: view.costCenter ?? "-" },
          { label: m.neededBy, children: thaiDate(view.neededBy) },
          ...(view.kind === "ADVANCE"
            ? [{ label: m.clearBy, children: thaiDate(view.clearBy) }]
            : []),
          { label: m.purpose, children: view.purpose ?? "-" },
        ]}
      />
      <div className="mt-4 rounded bg-blue-50 p-3">
        <div className="text-xs text-gray-500">{m.requested}</div>
        <div className="text-xl font-semibold text-blue-700">
          {baht(view.requestedAmount)}
        </div>
      </div>
      {view.actualAmount && (
        <div className="mt-2 rounded bg-green-50 p-3">
          <div className="text-xs text-gray-500">{m.actual}</div>
          <div className="text-xl font-semibold text-green-700">
            {baht(view.actualAmount)}
          </div>
        </div>
      )}
      <div className="my-3">
        {m.currentStatus}:{" "}
        <Tag color={STATUS_COLOR[view.status]}>{statuses[view.status]}</Tag>
      </div>
      <div className="mb-2 font-medium">{m.timeline}</div>
      <Timeline
        items={moments.map(([label, at]) => ({
          color: at ? "green" : "gray",
          children: (
            <>
              <div>{label}</div>
              <div className="text-xs text-gray-500">{thaiDateTime(at)}</div>
            </>
          ),
        }))}
      />
      {nextActor && (
        <div className="mt-2 text-sm">
          {messages.disbursement.approval.waitingOn}: <strong>{nextActor}</strong>
        </div>
      )}
    </Card>
  );
}
