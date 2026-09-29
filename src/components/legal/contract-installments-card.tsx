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
  Select,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ContractInstallment,
  ContractInstallmentsView,
} from "@/lib/api/contracts";
import { messages } from "@/lib/messages";

const m = messages.contracts.installments;

type Kind = ContractInstallment["kind"];
type GuaranteeType = NonNullable<ContractInstallment["guaranteeType"]>;

interface Row {
  kind: Kind;
  label: string;
  amount: number | null;
  dueOn: string | null;
  dueNote: string;
  milestone: string;
  guaranteeType: GuaranteeType | null;
  guaranteeAmount: number | null;
  guaranteeRef: string;
  guaranteeExpiresOn: string | null;
}

const blank = (kind: Kind): Row => ({
  kind,
  label: "",
  amount: null,
  dueOn: null,
  dueNote: "",
  milestone: "",
  guaranteeType: null,
  guaranteeAmount: null,
  guaranteeRef: "",
  guaranteeExpiresOn: null,
});

const toRow = (row: ContractInstallment): Row => ({
  kind: row.kind,
  label: row.label,
  amount: row.amount,
  dueOn: row.dueOn,
  dueNote: row.dueNote ?? "",
  milestone: row.milestone ?? "",
  guaranteeType: row.guaranteeType,
  guaranteeAmount: row.guaranteeAmount,
  guaranteeRef: row.guaranteeRef ?? "",
  guaranteeExpiresOn: row.guaranteeExpiresOn,
});

/** Money is added in satang, as the server does. */
const withCommas = (text: string | number | undefined) =>
  `${text ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const withoutCommas = (text: string | undefined) =>
  Number((text ?? "").replace(/,/g, ""));

const satang = (amount: number | null) => Math.round((amount ?? 0) * 100);
const baht = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * CD-164 — แผนการวางบิลตามงวด: every payment of the contract, from the
 * deposit to the retention, with when it is billed and the milestone that
 * unlocks it. Saved whole, and only when it adds up to the contract value;
 * the server checks the same rules and names what is wrong.
 */
export function ContractInstallmentsCard({
  contractId,
  view,
  canManage,
}: {
  readonly contractId: string;
  readonly view: ContractInstallmentsView;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = view.contractValue;

  const total = (rows ?? []).reduce((sum, row) => sum + satang(row.amount), 0);
  const gap = value === null ? null : total - satang(value);

  function patch(index: number, change: Partial<Row>) {
    setRows((current) =>
      (current ?? []).map((row, at) =>
        at === index ? { ...row, ...change } : row,
      ),
    );
  }

  async function save(schedule: Row[]) {
    setBusy(true);
    setError(null);
    const result = await appApi(`contracts/${contractId}/installments`, {
      method: "PUT",
      body: JSON.stringify({
        installments: schedule.map((row) => ({
          kind: row.kind,
          label: row.label,
          amount: row.amount ?? 0,
          due_on: row.dueOn,
          due_note: row.dueNote,
          milestone: row.milestone,
          guarantee_type: row.guaranteeType,
          guarantee_amount: row.guaranteeType ? row.guaranteeAmount : null,
          guarantee_ref: row.guaranteeType ? row.guaranteeRef : null,
          guarantee_expires_on: row.guaranteeType
            ? row.guaranteeExpiresOn
            : null,
        })),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setRows(null);
    router.refresh();
  }

  /** Both in satang. */
  const totalLine = (sum: number, difference: number | null) => (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span>
        {m.total} <b>{baht(sum / 100)}</b>
        {value !== null && (
          <Text type="secondary">
            {" "}
            / {m.value} {baht(value)} {view.currency}
          </Text>
        )}
      </span>
      {difference !== null &&
        (difference === 0 ? (
          <Tag color="green">{m.balanced}</Tag>
        ) : (
          <Tag color="red">
            {difference < 0
              ? m.short(baht(-difference / 100))
              : m.over(baht(difference / 100))}
          </Tag>
        ))}
    </div>
  );

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.installments.length}`}
      extra={
        canManage && value !== null ? (
          <Button
            size="small"
            onClick={() => {
              setError(null);
              setRows(
                view.installments.length
                  ? view.installments.map(toRow)
                  : [blank("progress")],
              );
            }}
          >
            {m.edit}
          </Button>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {value === null ? (
        <Text type="secondary">{m.noValue}</Text>
      ) : view.installments.length ? (
        <>
          <div className="divide-y">
            {view.installments.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {m.seq(row.seq)} · {row.label}{" "}
                    {row.label !== m.kinds[row.kind] && (
                      <Tag color={m.kindColor[row.kind]}>
                        {m.kinds[row.kind]}
                      </Tag>
                    )}
                  </div>
                  <Text type="secondary" className="block text-xs">
                    {[
                      row.dueOn ? dayjs(row.dueOn).format("D MMM YYYY") : null,
                      row.dueNote,
                      row.milestone ? `${m.milestone}: ${row.milestone}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {row.guaranteeType && (
                    <Text type="secondary" className="block text-xs">
                      {m.guarantee}: {m.guaranteeTypes[row.guaranteeType]}{" "}
                      {row.guaranteeAmount !== null &&
                        baht(row.guaranteeAmount)}
                      {row.guaranteeRef ? ` · ${row.guaranteeRef}` : ""}
                      {row.guaranteeExpiresOn
                        ? ` · ${m.guaranteeExpiresOn} ${dayjs(row.guaranteeExpiresOn).format("D MMM YYYY")}`
                        : ""}
                    </Text>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">{baht(row.amount)}</div>
                  {row.sharePct !== null && (
                    <Text type="secondary" className="text-xs">
                      {row.sharePct}%
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t pt-2">
            {totalLine(
              satang(view.total),
              view.difference === null ? null : satang(view.difference),
            )}
          </div>
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={m.empty}
        />
      )}

      <Modal
        open={rows !== null}
        title={m.formTitle}
        width={880}
        onCancel={() => setRows(null)}
        destroyOnHidden
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {view.installments.length > 0 && (
                <Button danger disabled={busy} onClick={() => save([])}>
                  {m.clear}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRows(null)}>{m.cancel}</Button>
              <Button
                type="primary"
                loading={busy}
                disabled={gap !== 0}
                title={gap !== 0 ? m.notBalanced : undefined}
                onClick={() => rows && save(rows)}
              >
                {messages.contracts.form.save}
              </Button>
            </div>
          </div>
        }
      >
        {error && <Alert type="error" showIcon className="mb-3" title={error} />}
        <div className="flex flex-col gap-3">
          {(rows ?? []).map((row, index) => {
            const rest =
              value === null
                ? null
                : satang(value) -
                  (total - satang(row.amount));
            return (
              <div key={index} className="rounded border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <b>{m.seq(index + 1)}</b>
                  <div className="flex gap-2">
                    {rest !== null && rest > 0 && (
                      <Button
                        size="small"
                        onClick={() => patch(index, { amount: rest / 100 })}
                      >
                        {m.fillRest}
                      </Button>
                    )}
                    <Button
                      size="small"
                      danger
                      onClick={() =>
                        setRows((current) =>
                          (current ?? []).filter((_, at) => at !== index),
                        )
                      }
                    >
                      {m.remove}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <label className="text-xs">
                    {m.kind}
                    <Select
                      className="w-full"
                      value={row.kind}
                      aria-label={m.kind}
                      options={Object.entries(m.kinds).map(([key, text]) => ({
                        value: key,
                        label: text,
                      }))}
                      onChange={(kind: Kind) => patch(index, { kind })}
                    />
                  </label>
                  <label className="text-xs sm:col-span-1">
                    {m.label}
                    <Input
                      value={row.label}
                      placeholder={m.labelPlaceholder}
                      maxLength={255}
                      onChange={(event) =>
                        patch(index, { label: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs">
                    {m.amount}
                    <InputNumber
                      className="w-full!"
                      min={0}
                      precision={2}
                      value={row.amount}
                      aria-label={m.amount}
                      formatter={withCommas}
                      parser={withoutCommas}
                      onChange={(amount) => patch(index, { amount })}
                    />
                  </label>
                  <label className="text-xs">
                    {m.share}
                    <InputNumber
                      className="w-full!"
                      min={0}
                      max={100}
                      precision={2}
                      aria-label={m.share}
                      value={
                        value && row.amount !== null
                          ? Math.round((row.amount / value) * 10_000) / 100
                          : null
                      }
                      onChange={(pct) =>
                        value &&
                        patch(index, {
                          amount:
                            pct === null
                              ? null
                              : Math.round(value * pct) / 100,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs">
                    {m.dueOn}
                    <DatePicker
                      className="w-full"
                      value={row.dueOn ? dayjs(row.dueOn) : null}
                      onChange={(date) =>
                        patch(index, {
                          dueOn: date ? date.format("YYYY-MM-DD") : null,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs">
                    {m.dueNote}
                    <Input
                      value={row.dueNote}
                      placeholder={m.dueNotePlaceholder}
                      maxLength={255}
                      onChange={(event) =>
                        patch(index, { dueNote: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    {m.milestone}
                    <Input
                      value={row.milestone}
                      placeholder={m.milestonePlaceholder}
                      maxLength={255}
                      onChange={(event) =>
                        patch(index, { milestone: event.target.value })
                      }
                    />
                  </label>
                </div>
                {(row.kind === "deposit" || row.guaranteeType) && (
                  <div className="mt-2 grid grid-cols-1 gap-2 rounded bg-black/[.03] p-2 sm:grid-cols-4">
                    <label className="text-xs">
                      {m.guarantee}
                      <Select
                        className="w-full"
                        allowClear
                        aria-label={m.guarantee}
                        value={row.guaranteeType ?? undefined}
                        options={Object.entries(m.guaranteeTypes).map(
                          ([key, text]) => ({ value: key, label: text }),
                        )}
                        onChange={(type?: GuaranteeType) =>
                          patch(index, {
                            guaranteeType: type ?? null,
                            guaranteeAmount:
                              row.guaranteeAmount ?? row.amount,
                          })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      {m.guaranteeAmount}
                      <InputNumber
                        className="w-full!"
                        min={0}
                        precision={2}
                        aria-label={m.guaranteeAmount}
                        formatter={withCommas}
                        parser={withoutCommas}
                        value={row.guaranteeAmount}
                        onChange={(guaranteeAmount) =>
                          patch(index, { guaranteeAmount })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      {m.guaranteeRef}
                      <Input
                        value={row.guaranteeRef}
                        maxLength={100}
                        onChange={(event) =>
                          patch(index, { guaranteeRef: event.target.value })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      {m.guaranteeExpiresOn}
                      <DatePicker
                        className="w-full"
                        value={
                          row.guaranteeExpiresOn
                            ? dayjs(row.guaranteeExpiresOn)
                            : null
                        }
                        onChange={(date) =>
                          patch(index, {
                            guaranteeExpiresOn: date
                              ? date.format("YYYY-MM-DD")
                              : null,
                          })
                        }
                      />
                    </label>
                    {row.kind === "deposit" && (
                      <Text type="secondary" className="text-xs sm:col-span-4">
                        {m.guaranteeNeeded}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <Button
            onClick={() =>
              setRows((current) => [
                ...(current ?? []),
                blank(current?.length ? "progress" : "deposit"),
              ])
            }
          >
            {m.addRow}
          </Button>
          {totalLine(total, gap)}
        </div>
      </Modal>
    </Card>
  );
}
