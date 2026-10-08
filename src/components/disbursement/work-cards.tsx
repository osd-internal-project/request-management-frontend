"use client";

import { useState } from "react";
import { Alert, Button, Card, Checkbox, Input, InputNumber, Select, Space, Table, Tag } from "antd";
import type { DisbursementDetail, DisbursementMovement } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { EvidenceFiles } from "./evidence-files";
import { baht, settlementSlip, thaiDate } from "./format";
import { LinesTable, type EditableLine } from "./lines-table";
import { useDisbursementAction } from "./use-disbursement-action";

const m = messages.disbursement;
/** Screen 6's four receipt boxes. */
const RECEIPT_KINDS = ["TAX_INVOICE", "RECEIPT_VOUCHER", "TRAVEL_SLIP", "OTHER"] as const;
const METHODS = Object.entries(m.pay.methods).map(([value, label]) => ({
  value,
  label,
}));

interface CardProps {
  readonly view: DisbursementDetail;
  readonly onFiles: (view: DisbursementDetail) => void;
}

/** Screen 4 — the accountant's three checks and remark; sends the ticket to the executive. */
export function VerifyCard({ view }: CardProps) {
  const { run, busy, error } = useDisbursementAction(view.docNo);
  const [checks, setChecks] = useState({
    checked_cost_center: false,
    checked_documents: false,
    checked_authority: false,
  });
  const [note, setNote] = useState("");
  const ready = Object.values(checks).every(Boolean) && note.trim() !== "";

  return (
    <Card title={m.verify.title}>
      <Space direction="vertical" className="w-full">
        {(
          [
            ["checked_cost_center", m.verify.checkedCostCenter],
            ["checked_documents", m.verify.checkedDocuments],
            ["checked_authority", m.verify.checkedAuthority],
          ] as const
        ).map(([key, label]) => (
          <Checkbox
            key={key}
            checked={checks[key]}
            onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })}
          >
            {label}
          </Checkbox>
        ))}
        <div>{m.verify.note}</div>
        <Input.TextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <Alert type="error" showIcon title={error} />}
        <Button
          type="primary"
          disabled={!ready}
          loading={busy}
          onClick={() => void run("verify", { ...checks, note })}
        >
          {view.legacy ? m.verify.submit : m.verify.submitV3}
        </Button>
      </Space>
    </Card>
  );
}

/** Screen 5 — one instalment: how much, when, how, with the slip. Never by the requester. */
export function PayCard({ view, onFiles, isRequester }: CardProps & { readonly isRequester: boolean }) {
  const { run, busy, error } = useDisbursementAction(view.docNo);
  const remaining = Math.max(0, Number(view.requestedAmount) - Number(view.paidAmount));
  const [amount, setAmount] = useState<number | null>(remaining);
  const [paidAt, setPaidAt] = useState("");
  const [method, setMethod] = useState("transfer");
  const [reference, setReference] = useState("");

  if (isRequester) return <Alert type="info" showIcon title={m.pay.self} />;

  return (
    <Card title={m.pay.title}>
      <Space direction="vertical" className="w-full">
        <div>{m.payments.paidSoFar(baht(view.paidAmount), baht(view.requestedAmount))}</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div>{m.pay.amount}</div>
            <InputNumber
              className="w-full"
              min={0.01}
              max={remaining}
              precision={2}
              value={amount}
              onChange={(value) => setAmount(value)}
            />
            <div className="text-xs text-gray-500">{m.payments.remain(baht(remaining))}</div>
          </div>
          <div>
            <div>{m.pay.paidAt}</div>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div>
            <div>{m.pay.method}</div>
            <Select className="w-full" value={method} onChange={setMethod} options={METHODS} />
          </div>
          <div>
            <div>{m.pay.reference}</div>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <EvidenceFiles
          docNo={view.docNo}
          files={view.files}
          kind="PAYMENT_SLIP"
          editable
          onChanged={onFiles}
        />
        {error && <Alert type="error" showIcon title={error} />}
        <Button
          type="primary"
          loading={busy}
          disabled={!amount || amount <= 0 || amount > remaining}
          onClick={() =>
            void run("pay", {
              amount,
              method,
              ...(paidAt ? { paid_at: paidAt } : {}),
              ...(reference.trim() ? { reference: reference.trim() } : {}),
            })
          }
        >
          {m.pay.submitInstalment}
        </Button>
      </Space>
    </Card>
  );
}

/** Every instalment and void; another accountant (not the payer, not the requester) may void one. */
export function PaymentsCard({
  view,
  viewerId,
  canPay,
}: {
  readonly view: DisbursementDetail;
  readonly viewerId: string;
  readonly canPay: boolean;
}) {
  const { run, busy, error } = useDisbursementAction(view.docNo);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const voided = new Set(
    view.movements.filter((row) => row.type === "PAYOUT_VOID").map((row) => row.reversesId),
  );
  const payouts = view.movements.filter((row) => row.type === "PAYOUT");
  const open = ["PARTIALLY_PAID", "PAID"].includes(view.status);
  const mayVoid = (row: DisbursementMovement) =>
    canPay && open && !voided.has(row.id) && row.actedBy !== viewerId && view.requesterId !== viewerId;

  return (
    <Card title={m.payments.title}>
      <Table<DisbursementMovement>
        rowKey="id"
        size="small"
        dataSource={payouts}
        pagination={false}
        locale={{ emptyText: m.payments.none }}
        scroll={{ x: 640 }}
        columns={[
          {
            title: m.payments.paidAt,
            dataIndex: "occurredAt",
            render: (value: string | null, row) => thaiDate(value ?? row.actedAt),
          },
          {
            title: m.payments.amount,
            dataIndex: "amount",
            align: "right",
            render: (value: string) => baht(-Number(value)),
          },
          {
            title: m.payments.method,
            dataIndex: "method",
            render: (value: string | null) => (value ? (m.pay.methods[value] ?? value) : "-"),
          },
          { title: m.payments.reference, dataIndex: "reference" },
          {
            key: "state",
            render: (_: unknown, row) =>
              voided.has(row.id) ? (
                <Tag color="red">{m.payments.voided}</Tag>
              ) : mayVoid(row) ? (
                <Button size="small" danger onClick={() => setVoiding(row.id)}>
                  {m.payments.void}
                </Button>
              ) : null,
          },
        ]}
      />
      {voiding && (
        <Space direction="vertical" className="mt-3 w-full">
          <div className="text-xs text-gray-500">{m.payments.voidHint}</div>
          <Input
            placeholder={m.payments.voidReason}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <Alert type="error" showIcon title={error} />}
          <Button
            danger
            loading={busy}
            disabled={!reason.trim()}
            onClick={() =>
              void run(`payments/${encodeURIComponent(voiding)}/void`, { reason: reason.trim() }).then(
                (ok) => {
                  if (ok) {
                    setVoiding(null);
                    setReason("");
                  }
                },
              )
            }
          >
            {m.payments.void}
          </Button>
        </Space>
      )}
    </Card>
  );
}

/** FI06 paid in full: accounting closes it; there is nothing to clear. */
export function PettyCloseCard({ view }: { readonly view: DisbursementDetail }) {
  const { run, busy, error } = useDisbursementAction(view.docNo);
  return (
    <Card title={m.close.pettyTitle}>
      <Space direction="vertical" className="w-full">
        <Alert type="info" showIcon title={m.close.pettyHint} />
        {error && <Alert type="error" showIcon title={error} />}
        <Button type="primary" loading={busy} onClick={() => void run("close", {})}>
          {m.close.pettySubmit}
        </Button>
      </Space>
    </Card>
  );
}

/** Screen 6 — the requester's actual spend, with receipts and the live difference. */
export function ClearingCard({ view, onFiles }: CardProps) {
  const { run, busy, error } = useDisbursementAction(view.docNo);
  const start = (view.actual.length ? view.actual : view.estimate).map(
    (line): EditableLine => ({
      description: line.description,
      cost_center: line.costCenter ?? "",
      amount: Number(line.amount),
      note: line.note ?? "",
    }),
  );
  const [lines, setLines] = useState<EditableLine[]>(start);
  const spent = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const diff = Number(view.paidAmount) - spent;

  return (
    <Card title={m.clearing.title}>
      <Space direction="vertical" className="w-full">
        <Alert type="warning" showIcon title={m.clearing.hint} />
        <LinesTable lines={lines} editable onChange={setLines} />
        <Alert
          type={diff >= 0 ? "success" : "warning"}
          showIcon
          title={
            diff >= 0
              ? m.clearing.remain(baht(diff))
              : m.clearing.over(baht(-diff))
          }
        />
        {RECEIPT_KINDS.map((kind) => (
          <EvidenceFiles
            key={kind}
            docNo={view.docNo}
            files={view.files}
            kind={kind}
            editable
            onChanged={onFiles}
          />
        ))}
        {error && <Alert type="error" showIcon title={error} />}
        <Button
          type="primary"
          loading={busy}
          disabled={!lines.length}
          onClick={() =>
            void run("clearing", {
              items: lines.map((line) => ({
                description: line.description,
                amount: line.amount ?? 0,
                ...(line.cost_center ? { cost_center: line.cost_center } : {}),
                ...(line.note ? { note: line.note } : {}),
              })),
            })
          }
        >
          {m.clearing.submit}
        </Button>
      </Space>
    </Card>
  );
}

/** Screen 7 — accounting clears the documents: complete (settling the difference, slip attached) or send back. */
export function CloseCard({ view, onFiles }: CardProps) {
  const { run, busy, error } = useDisbursementAction(view.docNo);
  const [method, setMethod] = useState("transfer");
  const [reference, setReference] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const refund = Number(view.pending?.refund ?? 0);
  const extra = Number(view.pending?.extraPay ?? 0);
  const slip = settlementSlip(view);

  return (
    <Card title={m.close.title}>
      <Space direction="vertical" className="w-full">
        <LinesTable lines={view.actual} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div>{m.summary.requested}</div>
            <Input value={baht(view.paidAmount)} disabled />
          </div>
          <div>
            <div>{m.summary.actual}</div>
            <Input value={baht(view.actualAmount)} disabled />
          </div>
          <div>
            <div>{refund ? m.summary.refund : m.summary.extra}</div>
            <Input value={baht(refund || extra)} disabled />
          </div>
        </div>
        {RECEIPT_KINDS.map((kind) => (
          <EvidenceFiles
            key={kind}
            docNo={view.docNo}
            files={view.files}
            kind={kind}
            editable={false}
            onChanged={onFiles}
          />
        ))}
        {refund || extra ? (
          <>
            <div className="font-medium">{m.close.settleTitle}</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select value={method} onChange={setMethod} options={METHODS} />
              <Input
                placeholder={m.close.reference}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <div>
                <div>{m.close.occurredAt}</div>
                <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
              </div>
            </div>
            {slip.kind && (
              <EvidenceFiles
                docNo={view.docNo}
                files={view.files}
                kind={slip.kind}
                editable
                onChanged={onFiles}
              />
            )}
            {slip.kind && !slip.attached && (
              <Alert type="warning" showIcon title={m.close.slipNeeded[slip.kind]} />
            )}
          </>
        ) : (
          <Alert type="success" showIcon title={m.close.exact} />
        )}
        {error && <Alert type="error" showIcon title={error} />}
        <Space wrap>
          <Button
            type="primary"
            loading={busy}
            disabled={!slip.attached}
            onClick={() =>
              void run("close", {
                ...(refund || extra ? { method } : {}),
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                ...(occurredAt ? { occurred_at: occurredAt } : {}),
              })
            }
          >
            {m.close.submit}
          </Button>
        </Space>
        <div className="mt-2 font-medium">{m.clearing.returnTitle}</div>
        <Input
          placeholder={m.clearing.returnReason}
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
        />
        <Button
          danger
          loading={busy}
          disabled={!returnReason.trim()}
          onClick={() =>
            void run("clearing/return", { reason: returnReason.trim() })
          }
        >
          {m.clearing.returnAction}
        </Button>
      </Space>
    </Card>
  );
}
