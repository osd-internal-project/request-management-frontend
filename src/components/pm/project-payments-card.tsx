"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type {
  PaymentInstallmentView,
  ProjectPaymentsView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.payments;
const show = (day: string) => dayjs(day).format("D MMM YY");

interface Draft {
  row: PaymentInstallmentView;
  invoiceNo: string;
  invoicedOn: Dayjs | null;
  invoicedAmount: number | null;
  paidOn: Dayjs | null;
  paidAmount: number | null;
  note: string;
}

/**
 * CD-193 — the contract's installments: billed, paid, ready to bill or
 * waiting on their milestone, the late ones, and the cash month by month.
 * Recorded by hand until SAP reads it.
 */
export function ProjectPaymentsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectPaymentsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { totals } = view;

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const result = await appApi(
      `projects/${projectId}/payments/${draft.row.seq}`,
      {
        method: "PUT",
        body: JSON.stringify({
          invoice_no: draft.invoiceNo || undefined,
          invoiced_on: draft.invoicedOn?.format("YYYY-MM-DD"),
          invoiced_amount: draft.invoicedAmount ?? undefined,
          paid_on: draft.paidOn?.format("YYYY-MM-DD"),
          paid_amount: draft.paidAmount ?? undefined,
          note: draft.note || undefined,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setDraft(null);
    router.refresh();
  }

  return (
    <Card size="small" title={`${m.title} · ${view.installments.length}`}>
      <Text type="secondary" className="mb-1 block text-xs">
        {m.hint}
      </Text>
      {view.installments.length > 0 && (
        <div className="mb-2 text-xs">
          {m.totals(
            formatAmount(totals.scheduled),
            formatAmount(totals.invoiced),
            formatAmount(totals.received),
            formatAmount(totals.outstanding),
          )}
          {totals.billable > 0 && (
            <Tag className="ml-2" color="gold">
              {m.billableTotal(formatAmount(totals.billable))}
            </Tag>
          )}
          {totals.overdue > 0 && (
            <Tag className="ml-2" color="red">
              {m.overdueTotal(formatAmount(totals.overdue))}
            </Tag>
          )}
        </div>
      )}

      {view.installments.length ? (
        <div className="divide-y">
          {view.installments.map((row) => (
            <div key={row.seq} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {row.label} · {formatAmount(row.amount)}
                  </span>{" "}
                  <Tag color={m.stateColor[row.state]}>
                    {m.state[row.state]}
                  </Tag>
                  {row.overdue && <Tag color="red">{m.overdue}</Tag>}
                </div>
                {view.canEdit && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setError(null);
                      setDraft({
                        row,
                        invoiceNo: row.billing?.invoiceNo ?? "",
                        invoicedOn: row.billing?.invoicedOn
                          ? dayjs(row.billing.invoicedOn)
                          : null,
                        invoicedAmount:
                          row.billing?.invoicedAmount ?? row.amount,
                        paidOn: row.billing?.paidOn
                          ? dayjs(row.billing.paidOn)
                          : null,
                        paidAmount: row.billing?.paidAmount ?? null,
                        note: row.billing?.note ?? "",
                      });
                    }}
                  >
                    {m.record}
                  </Button>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {row.milestone
                  ? m.milestone(
                      row.milestone.title,
                      row.milestone.forecast
                        ? show(row.milestone.forecast)
                        : null,
                    )
                  : m.noMilestone}
                {row.dueOn && ` · ${m.due(show(row.dueOn))}`}
                {row.state === "waiting" &&
                  row.expectedBillOn &&
                  ` · ${m.expectedBill(show(row.expectedBillOn))}`}
                {row.state !== "paid" &&
                  row.expectedPayOn &&
                  ` · ${m.expectedPay(show(row.expectedPayOn))}`}
              </Text>
              {row.billing?.invoicedOn && (
                <Text className="block text-xs">
                  {m.invoice(
                    row.billing.invoiceNo,
                    show(row.billing.invoicedOn),
                    formatAmount(row.billing.invoicedAmount ?? row.amount),
                  )}
                  {row.billing.paidOn &&
                    ` · ${m.paid(
                      show(row.billing.paidOn),
                      formatAmount(row.billing.paidAmount ?? row.amount),
                    )}`}
                </Text>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      {view.forecast.months.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium">{m.cash}</div>
          {view.forecast.months.map((row) => (
            <div key={row.month} className="flex justify-between text-xs">
              <span>{dayjs(`${row.month}-01`).format("MMM YYYY")}</span>
              <span>
                {m.cashRow(
                  formatAmount(row.received),
                  formatAmount(row.expected),
                )}
              </span>
            </div>
          ))}
          {view.forecast.unscheduled > 0 && (
            <Text type="secondary" className="block text-xs">
              {m.unscheduled(formatAmount(view.forecast.unscheduled))}
            </Text>
          )}
        </div>
      )}

      <Modal
        open={draft !== null}
        title={m.form.title(draft?.row.label ?? "")}
        onCancel={() => setDraft(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {draft && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.invoiceNo}
              <Input
                value={draft.invoiceNo}
                maxLength={50}
                onChange={(event) =>
                  setDraft({ ...draft, invoiceNo: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.invoicedOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.invoicedOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    setDraft({ ...draft, invoicedOn: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.invoicedAmount}
                <InputNumber
                  className="w-full!"
                  min={0}
                  value={draft.invoicedAmount}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      invoicedAmount: value === null ? null : Number(value),
                    })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.paidOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.paidOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) => setDraft({ ...draft, paidOn: value })}
                />
              </label>
              <label className="block text-xs">
                {m.form.paidAmount}
                <InputNumber
                  className="w-full!"
                  min={0}
                  value={draft.paidAmount}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      paidAmount: value === null ? null : Number(value),
                    })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={2}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
