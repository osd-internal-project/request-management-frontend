"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ContractTermsView } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.terms;

const money = (value: number) => value.toLocaleString("th-TH");
const date = (value: string) => dayjs(value).format("D MMM YYYY");

interface Draft {
  unlimited: boolean;
  capAmount: number | null;
  liabilityNote: string;
  ratePct: number | null;
  period?: string;
  basis?: string;
  basisNote: string;
  capPct: number | null;
  penaltyCapAmount: number | null;
  months: number | null;
  scope: string;
  exclusions: string;
  acceptedOn: string | null;
  noticeDays: number | null;
  conditions: string;
  consequences: string;
  steps: string[];
}

const draftOf = (view: ContractTermsView): Draft => ({
  unlimited: view.liability.unlimited,
  capAmount: view.liability.capAmount,
  liabilityNote: view.liability.note ?? "",
  ratePct: view.penalty.ratePct,
  period: view.penalty.period ?? undefined,
  basis: view.penalty.basis ?? undefined,
  basisNote: view.penalty.basisNote ?? "",
  capPct: view.penalty.capPct,
  penaltyCapAmount: view.penalty.capAmount,
  months: view.warranty.months,
  scope: view.warranty.scope ?? "",
  exclusions: view.warranty.exclusions ?? "",
  acceptedOn: view.warranty.acceptedOn,
  noticeDays: view.termination.noticeDays,
  conditions: view.termination.conditions ?? "",
  consequences: view.termination.consequences ?? "",
  steps: view.termination.steps,
});

/**
 * CD-153..156 — ข้อกำหนดของสัญญา as values: the liability cap against the
 * contract value (and the executives' approval when it is above), the
 * penalty with its ceiling in money, the warranty counted from acceptance,
 * and what termination takes. Legal edits them together in one form.
 */
export function ContractTermsCard({
  contractId,
  view,
  canManage,
}: {
  readonly contractId: string;
  readonly view: ContractTermsView;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftOf(view));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (next: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...next }));

  async function save() {
    setBusy(true);
    setError(null);
    const result = await appApi(`contracts/${contractId}/terms`, {
      method: "PUT",
      body: JSON.stringify({
        liability_unlimited: draft.unlimited,
        liability_cap_amount: draft.unlimited ? null : draft.capAmount,
        liability_note: draft.liabilityNote,
        penalty_rate_pct: draft.ratePct,
        penalty_period: draft.period ?? null,
        penalty_basis: draft.basis ?? null,
        penalty_basis_note: draft.basisNote,
        penalty_cap_pct: draft.capPct,
        penalty_cap_amount: draft.penaltyCapAmount,
        warranty_months: draft.months,
        warranty_scope: draft.scope,
        warranty_exclusions: draft.exclusions,
        accepted_on: draft.acceptedOn,
        termination_notice_days: draft.noticeDays,
        termination_conditions: draft.conditions,
        termination_consequences: draft.consequences,
        termination_steps: draft.steps.filter((step) => step.trim()),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setEditing(false);
    router.refresh();
  }

  async function askAgain() {
    const result = await appApi(
      `contracts/${contractId}/terms/liability-approval`,
      { method: "POST" },
    );
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.asked);
    router.refresh();
  }

  const { liability, penalty, warranty, termination } = view;
  const approval = liability.approval;
  const overPct =
    liability.capAmount !== null && view.contractValue
      ? Math.round((liability.capAmount / view.contractValue - 1) * 100)
      : null;

  const section = (title: string, body: React.ReactNode) => (
    <div>
      <Text strong className="block">
        {title}
      </Text>
      <div className="mt-1 space-y-1 text-sm">{body}</div>
    </div>
  );
  const none = (
    <Text type="secondary" className="text-sm">
      {m.notSet}
    </Text>
  );

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        canManage ? (
          <Button
            size="small"
            onClick={() => {
              setDraft(draftOf(view));
              setError(null);
              setEditing(true);
            }}
          >
            {m.edit}
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {section(
          m.liability,
          liability.unlimited || liability.capAmount !== null ? (
            <>
              <div>
                {liability.unlimited
                  ? m.unlimited
                  : `${money(liability.capAmount!)} บาท`}
                {!liability.unlimited && overPct !== null && (
                  <Text type="secondary" className="ml-2 text-xs">
                    {overPct > 0 ? m.overValue(overPct) : m.withinValue}
                  </Text>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag color={m.approvalColor[approval.state]}>
                  {m.approval[approval.state]}
                </Tag>
                {approval.request && (
                  <Link href={ROUTES.requestDetail(approval.request.id)}>
                    {approval.request.requestNo ?? m.openDraft}
                  </Link>
                )}
                {canManage &&
                  (approval.state === "missing" ||
                    approval.state === "rejected") && (
                    <Button size="small" onClick={() => void askAgain()}>
                      {m.askAgain}
                    </Button>
                  )}
              </div>
              {approval.error && (
                <Text type="danger" className="block text-xs">
                  {approval.error}
                </Text>
              )}
              {liability.note && (
                <Text type="secondary" className="block text-xs">
                  {liability.note}
                </Text>
              )}
            </>
          ) : (
            none
          ),
        )}

        {section(
          m.penalty,
          penalty.ratePct !== null ? (
            <>
              <div>
                {m.penaltyLine(
                  String(penalty.ratePct),
                  m.periods[penalty.period ?? ""] ?? "",
                  penalty.basis === "other"
                    ? (penalty.basisNote ?? m.bases.other)
                    : (m.bases[penalty.basis ?? ""] ?? ""),
                )}
              </div>
              {penalty.ceiling !== null && (
                <Text type="secondary" className="block text-xs">
                  {m.ceiling(money(penalty.ceiling))}
                </Text>
              )}
            </>
          ) : (
            none
          ),
        )}

        {section(
          m.warranty,
          warranty.months ? (
            <>
              <div>
                {warranty.period
                  ? m.warrantyRuns(
                      date(warranty.period.startsOn),
                      date(warranty.period.endsOn),
                    )
                  : m.warrantyWaiting(warranty.months)}
              </div>
              {warranty.scope && (
                <Text className="block text-xs">
                  {m.warrantyScope}: {warranty.scope}
                </Text>
              )}
              {warranty.exclusions && (
                <Text type="secondary" className="block text-xs">
                  {m.warrantyExclusions}: {warranty.exclusions}
                </Text>
              )}
            </>
          ) : (
            none
          ),
        )}

        {section(
          m.termination,
          termination.noticeDays !== null ||
            termination.conditions ||
            termination.steps.length ? (
            <>
              {termination.noticeDays !== null && (
                <div>{m.notice(termination.noticeDays)}</div>
              )}
              {termination.conditions && (
                <Text className="block text-xs whitespace-pre-line">
                  {termination.conditions}
                </Text>
              )}
              {termination.consequences && (
                <Text
                  type="secondary"
                  className="block text-xs whitespace-pre-line"
                >
                  {m.consequences}: {termination.consequences}
                </Text>
              )}
              {termination.steps.length > 0 && (
                <ol className="ml-4 list-decimal text-xs">
                  {termination.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            none
          ),
        )}
      </div>

      <Modal
        open={editing}
        width={720}
        title={m.edit}
        onCancel={() => setEditing(false)}
        okText={messages.contracts.form.save}
        okButtonProps={{ loading: busy }}
        onOk={() => void save()}
      >
        <div className="space-y-4">
          <div>
            <Text strong>{m.liability}</Text>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <Checkbox
                checked={draft.unlimited}
                onChange={(event) => set({ unlimited: event.target.checked })}
              >
                {m.unlimited}
              </Checkbox>
              {!draft.unlimited && (
                <InputNumber
                  className="w-full!"
                  min={0}
                  placeholder={m.capAmount}
                  value={draft.capAmount}
                  onChange={(value) => set({ capAmount: value ?? null })}
                />
              )}
              <Input
                className="sm:col-span-2"
                placeholder={m.liabilityNote}
                value={draft.liabilityNote}
                onChange={(event) => set({ liabilityNote: event.target.value })}
              />
            </div>
          </div>

          <div>
            <Text strong>{m.penalty}</Text>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              <InputNumber
                className="w-full!"
                min={0}
                step={0.01}
                placeholder={m.penaltyRate}
                value={draft.ratePct}
                onChange={(value) => set({ ratePct: value ?? null })}
              />
              <Select
                allowClear
                placeholder={m.penaltyPeriod}
                value={draft.period}
                onChange={(period?: string) => set({ period })}
                options={Object.entries(m.periods).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Select
                allowClear
                placeholder={m.penaltyBasis}
                value={draft.basis}
                onChange={(basis?: string) => set({ basis })}
                options={Object.entries(m.bases).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              {draft.basis === "other" && (
                <Input
                  className="sm:col-span-3"
                  placeholder={m.penaltyBasisNote}
                  value={draft.basisNote}
                  onChange={(event) => set({ basisNote: event.target.value })}
                />
              )}
              <InputNumber
                className="w-full!"
                min={0}
                max={100}
                placeholder={m.penaltyCapPct}
                value={draft.capPct}
                onChange={(value) =>
                  set({ capPct: value ?? null, penaltyCapAmount: null })
                }
              />
              <InputNumber
                className="w-full! sm:col-span-2"
                min={0}
                placeholder={m.penaltyCapAmount}
                value={draft.penaltyCapAmount}
                onChange={(value) =>
                  set({ penaltyCapAmount: value ?? null, capPct: null })
                }
              />
            </div>
          </div>

          <div>
            <Text strong>{m.warranty}</Text>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <InputNumber
                className="w-full!"
                min={0}
                placeholder={m.warrantyMonths}
                value={draft.months}
                onChange={(value) => set({ months: value ?? null })}
              />
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                placeholder={m.acceptedOn}
                value={draft.acceptedOn ? dayjs(draft.acceptedOn) : null}
                onChange={(next) =>
                  set({ acceptedOn: next ? next.format("YYYY-MM-DD") : null })
                }
              />
              <Text type="secondary" className="text-xs sm:col-span-2">
                {m.acceptedHint}
              </Text>
              <Input.TextArea
                rows={2}
                placeholder={m.warrantyScope}
                value={draft.scope}
                onChange={(event) => set({ scope: event.target.value })}
              />
              <Input.TextArea
                rows={2}
                placeholder={m.warrantyExclusions}
                value={draft.exclusions}
                onChange={(event) => set({ exclusions: event.target.value })}
              />
            </div>
          </div>

          <div>
            <Text strong>{m.termination}</Text>
            <div className="mt-1 grid gap-2">
              <InputNumber
                className="w-48!"
                min={0}
                placeholder={m.noticeDays}
                value={draft.noticeDays}
                onChange={(value) => set({ noticeDays: value ?? null })}
              />
              <Input.TextArea
                rows={2}
                placeholder={m.conditions}
                value={draft.conditions}
                onChange={(event) => set({ conditions: event.target.value })}
              />
              <Input.TextArea
                rows={2}
                placeholder={m.consequences}
                value={draft.consequences}
                onChange={(event) => set({ consequences: event.target.value })}
              />
              <Text className="text-xs">{m.steps}</Text>
              {draft.steps.map((step, index) => (
                <Input
                  key={index}
                  prefix={<Text type="secondary">{index + 1}.</Text>}
                  value={step}
                  onChange={(event) =>
                    set({
                      steps: draft.steps.map((value, i) =>
                        i === index ? event.target.value : value,
                      ),
                    })
                  }
                />
              ))}
              <Button
                size="small"
                className="w-fit"
                onClick={() => set({ steps: [...draft.steps, ""] })}
              >
                {m.addStep}
              </Button>
            </div>
          </div>
          {error && <Alert type="error" showIcon title={error} />}
        </div>
      </Modal>
    </Card>
  );
}
