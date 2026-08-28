"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Space,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import type {
  ApprovalCase,
  CodedLabel,
  RequestDetail,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export type { ApprovalStep, ApprovalCase } from "@/lib/api/types";


function money(amount: string | null, currency: string | null): string {
  if (amount === null) return "—";
  return `${Number(amount).toLocaleString("th-TH")} ${currency ?? ""}`.trim();
}

/** One line of the queue row, as §16 writes it. */
function summary(approvalCase: ApprovalCase): string {
  const payload = approvalCase.payload ?? {};
  const discount = payload.discount_pct;
  const deal = approvalCase.subjectId;

  return [
    discount !== undefined ? `ขอส่วนลด ${String(discount)}%` : approvalCase.subjectType,
    deal ? `ดีล ${deal}` : null,
    money(approvalCase.amount, approvalCase.currency),
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Screen §16 หน้าที่ 5 — อนุมัติ (มุมมอง CFO).
 *
 * **Two-pane, not list + modal.** An approver works a queue: they compare the
 * next item against the one they just decided, and a dialog that hides the
 * queue each time makes that impossible. The mockup is explicit about this,
 * and the earlier build got it wrong.
 *
 * The margin is *absent* from the payload when the caller lacks
 * `request.sensitive.read` — the backend removes the field (SCOPE-04) — so a
 * missing value is reported as "no permission", never as zero.
 */
export function ApprovalInbox({
  cases: initial,
  total,
  delegation,
}: {
  cases: ApprovalCase[];
  total: number;
  /** Set while this person is covering for somebody (APV-03). */
  delegation?: { name: string; window: string } | null;
}) {
  const [cases, setCases] = useState(initial);
  const [count, setCount] = useState(total);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null,
  );
  const [batch, setBatch] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = cases.find((entry) => entry.id === selectedId) ?? null;

  async function refresh() {
    const result = await appApi<{ data: ApprovalCase[]; total: number }>(
      "approvals/inbox",
    );

    if (result.ok) {
      setCases(result.data.data);
      setCount(result.data.total);
      setSelectedId(result.data.data[0]?.id ?? null);
      setBatch([]);
    }
  }

  async function decide(
    caseId: string,
    decision: "approve" | "reject" | "return",
    note: string,
    reasonCodes: string[],
  ) {
    setBusy(true);
    setError(null);

    const result = await appApi(`approvals/${caseId}/decide`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        note: note || undefined,
        reason_codes: reasonCodes.length ? reasonCodes : undefined,
      }),
    });

    setBusy(false);

    if (result.ok) {
      void message.success(messages.approvals.decided);
      await refresh();
    } else setError(result.message);
  }

  /** APV-04 — one transaction each, so nineteen good decisions survive a bad one. */
  async function approveBatch() {
    setBusy(true);
    setError(null);

    const result = await appApi("approvals/batch-decide", {
      method: "POST",
      body: JSON.stringify({ case_ids: batch, decision: "approve" }),
    });

    setBusy(false);

    if (result.ok) {
      void message.success(messages.approvals.decided);
      await refresh();
    } else setError(result.message);
  }

  /** Two requests naming the same deal — the mockup flags them for batching. */
  function sameDealAs(approvalCase: ApprovalCase): string | null {
    const twin = cases.find(
      (other) =>
        other.id !== approvalCase.id &&
        other.subjectId === approvalCase.subjectId,
    );

    return twin ? (twin.subjectId ?? null) : null;
  }

  return (
    <div className="space-y-4">
      {delegation && (
        <Alert
          type="info"
          showIcon
          title={messages.approvals.delegationBanner(
            delegation.name,
            delegation.window,
          )}
        />
      )}

      {error && <Alert type="error" showIcon title={error} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card
          title={messages.approvals.queueTitle(count)}
          extra={
            <Button
              size="small"
              disabled={!batch.length || busy}
              onClick={() => void approveBatch()}
            >
              {messages.approvals.batchApprove}
              {batch.length ? ` · ${batch.length}` : ""}
            </Button>
          }
        >
          {cases.length ? (
            <ul className="divide-y divide-black/5">
              {cases.map((entry) => {
                const twin = sameDealAs(entry);

                return (
                  <li key={entry.id} className="flex gap-2 py-2">
                    <Checkbox
                      checked={batch.includes(entry.id)}
                      onChange={(event) =>
                        setBatch((current) =>
                          event.target.checked
                            ? [...current, entry.id]
                            : current.filter((id) => id !== entry.id),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`min-w-0 grow cursor-pointer rounded px-2 py-1 text-left hover:bg-black/5 ${
                        entry.id === selectedId ? "bg-black/5 font-medium" : ""
                      }`}
                    >
                      <div className="truncate">{entry.subjectId}</div>
                      <Text type="secondary" className="text-xs">
                        {summary(entry)}
                      </Text>
                      <div>
                        <Text type="secondary" className="text-xs">
                          {messages.approvals.step}{" "}
                          {entry.currentStep}/{entry.steps.length}
                        </Text>
                        {twin && (
                          <Tag color="blue" className="ml-1">
                            {messages.approvals.sameDeal(twin)}
                          </Tag>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty description={messages.approvals.empty} />
          )}
        </Card>

        {selected ? (
          <DecisionPane
            key={selected.id}
            approvalCase={selected}
            busy={busy}
            onDecide={(decision, note, reasons) =>
              void decide(selected.id, decision, note, reasons)
            }
          />
        ) : (
          <Card title={messages.approvals.detailTitle}>
            <Empty description={messages.approvals.selectFromQueue} />
          </Card>
        )}
      </div>
    </div>
  );
}

/** The right-hand pane: what is being decided, then the decision. */
function DecisionPane({
  approvalCase,
  busy,
  onDecide,
}: {
  approvalCase: ApprovalCase;
  busy: boolean;
  onDecide: (
    decision: "approve" | "reject" | "return",
    note: string,
    reasonCodes: string[],
  ) => void;
}) {
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const requestId = approvalCase.requestId ?? null;

  /**
   * `null` while loading. A case with no request behind it (APV-07) resolves
   * to an empty list immediately — there is no requester to return to.
   */
  const [available, setAvailable] = useState<CodedLabel[] | null>(
    requestId ? null : [],
  );
  const [reasonError, setReasonError] = useState<string | null>(null);

  /**
   * REQ-04 — the reasons this request may be returned with.
   *
   * Loaded from the request rather than held as a constant. A hardcoded list
   * lived here until 28 Aug 2026 and two of its four codes were not in the
   * type's configuration, so the server answered
   * `400 เหตุผลการตีกลับไม่ถูกต้อง` and those buttons simply did not work.
   *
   * `typeSnapshot` first, then the live type — the same order as
   * `requests.service.ts:706`. The server judges an in-flight request by the
   * configuration it was raised under, so offering the current type's reasons
   * would recreate the bug the first time an admin edits a type.
   */
  useEffect(() => {
    if (!requestId) return;

    let cancelled = false;

    void appApi<RequestDetail>(`requests/${requestId}`).then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setReasonError(result.message);
        setAvailable([]);

        return;
      }

      setAvailable(
        result.data.typeSnapshot?.returnReasonCodes ??
          result.data.requestType?.returnReasonCodes ??
          [],
      );
    });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const payload = approvalCase.payload ?? {};
  const margin = payload.est_margin_pct;
  const decided = approvalCase.steps.filter((step) => step.decision);

  return (
    <Card title={messages.approvals.detailTitle}>
      <Space orientation="vertical" size="middle" className="flex">
        <div className="space-y-1 text-sm">
          <div>
            <Text strong>{messages.approvals.amount}: </Text>
            {money(approvalCase.amount, approvalCase.currency)}
          </div>

          <div>
            <Text strong>{messages.approvals.marginAfter}: </Text>
            {margin === undefined ? (
              // Absent, not zero: the field was removed before it left the
              // server, so there is nothing here to reveal.
              <Text type="secondary">{messages.approvals.marginHidden}</Text>
            ) : (
              <>
                {String(margin)}%{" "}
                <Text type="secondary">
                  {messages.approvals.marginFloor("15")}
                </Text>
              </>
            )}
          </div>

          {decided.map((step) => (
            <div key={step.stepNo}>
              <Text type="secondary">
                {messages.approvals.previousStep(step.stepNo)}
              </Text>
            </div>
          ))}

          {typeof payload.reason === "string" && (
            <div>
              <Text strong>{messages.approvals.requesterReason}: </Text>
              {payload.reason}
            </div>
          )}

          {approvalCase.requestId && (
            <Link
              href={ROUTES.requestDetail(approvalCase.requestId)}
              className="text-blue-600"
            >
              {messages.approvals.openFull(0)}
            </Link>
          )}
        </div>

        {/* APV-05 — stated before the buttons, because it governs them. */}
        <Alert type="info" showIcon title={messages.approvals.snapshotNote} />

        <label className="block">
          <Text strong>{messages.approvals.commentLabel}</Text>
          <Input.TextArea
            className="mt-1"
            rows={3}
            value={note}
            placeholder={messages.approvals.commentPlaceholder}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        {/*
          Hidden entirely for a case with no request behind it (APV-07): there
          is no requester to return to, so offering the control would promise
          something that cannot happen.
        */}
        {requestId && (
          <div>
            <Text strong>{messages.approvals.returnReasonsLabel}</Text>

            {reasonError ? (
              <Alert
                type="warning"
                showIcon
                className="mt-1"
                message={messages.approvals.reasonsUnavailable}
                description={reasonError}
              />
            ) : available === null ? (
              <Text type="secondary" className="mt-1 block text-xs">
                {messages.common.loading}
              </Text>
            ) : available.length ? (
              <div className="mt-1 flex flex-wrap gap-3">
                {available.map((reason) => (
                  <Checkbox
                    key={reason.code}
                    checked={reasons.includes(reason.code)}
                    onChange={(event) =>
                      setReasons((current) =>
                        event.target.checked
                          ? [...current, reason.code]
                          : current.filter((code) => code !== reason.code),
                      )
                    }
                  >
                    {reason.name}
                  </Checkbox>
                ))}
              </div>
            ) : (
              <Alert
                type="warning"
                showIcon
                className="mt-1"
                message={messages.approvals.reasonsMissing}
              />
            )}
          </div>
        )}

        <Space className="justify-end flex">
          <Button
            danger
            loading={busy}
            // The backend refuses a rejection with no reason; disabling the
            // button says so before the round trip rather than after it.
            disabled={!note.trim()}
            onClick={() => onDecide("reject", note, reasons)}
          >
            {messages.approvals.reject}
          </Button>
          <Button
            loading={busy}
            disabled={!note.trim() || !reasons.length}
            onClick={() => onDecide("return", note, reasons)}
          >
            {messages.approvals.returnForEdit}
          </Button>
          <Button
            type="primary"
            loading={busy}
            onClick={() => onDecide("approve", note, [])}
          >
            {messages.approvals.approve}
          </Button>
        </Space>

        <Paragraph type="secondary" className="mb-0! text-xs">
          {messages.approvals.reasonRequired}
        </Paragraph>
      </Space>
    </Card>
  );
}
