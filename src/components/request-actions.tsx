"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, App, Button, Input, Modal, Space } from "antd";
import Text from "antd/es/typography/Text";
import {
  assignRequest,
  cancelRequest,
  closeRequest,
  completeRequest,
  decideCase,
  holdRequest,
  receiveRequest,
  resumeRequest,
  returnRequest,
} from "@/lib/api/client-requests";
import type { CodedLabel } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/search-select";
import { ROUTES } from "@/lib/routes";

/**
 * What this person can do to this ticket, right now.
 *
 * A request moves by hand, not by time: it waits for its receiver to accept
 * it, for the work to be declared finished, and for the requester to accept
 * the result. Each of those is a button, and each is shown only to the person
 * whose turn it is — a "รับเรื่อง" button offered to somebody who is not the
 * receiver is a button that answers 403.
 *
 * The backend re-checks every one of these; hiding a control is convenience,
 * never access control (ROLE-01).
 */
export function RequestActions({
  request,
  viewerId,
}: {
  readonly request: {
    id: string;
    status: string;
    requesterId?: string;
    receiverUserId?: string | null;
    assigneeUserId?: string | null;
    /** The open approval case, when the request is waiting on a decision. */
    approvalCaseId?: string | null;
    /** Everyone who may decide the step it is waiting on. */
    approverCandidateIds?: string[];
    /** The type asks the receiver for a form — see `ReceiverForm`. */
    hasReceiverForm?: boolean;
    /**
     * REQ-04 — the bounce causes this request may be returned with, taken from
     * the snapshot it was raised under so the picker offers exactly what the
     * server will accept.
     */
    returnReasons?: readonly CodedLabel[];
  };
  readonly viewerId: string;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Which reason dialog is open, if any. */
  const [asking, setAsking] = useState<ReasonAction | null>(null);

  const isRequester = request.requesterId === viewerId;
  const isReceiver = request.receiverUserId === viewerId;
  const isWorker = request.assigneeUserId === viewerId || isReceiver;
  const isApprover = (request.approverCandidateIds ?? []).includes(viewerId);

  async function run(name: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(name);
    setError(null);

    const result = await action();

    setBusy(null);

    if (result.ok) {
      void message.success(messages.requestDetail.actionDone);
      router.refresh();
    } else {
      setError(result.message ?? messages.common.loadError);
    }
  }

  const actions: React.ReactNode[] = [];

  if (request.status === "submitted" && isReceiver) {
    actions.push(
      <Button
        key="receive"
        type="primary"
        loading={busy === "receive"}
        onClick={() => void run("receive", () => receiveRequest(request.id))}
      >
        {messages.requestDetail.receive}
      </Button>,
    );
  }

  if (request.status === "in_progress" && isWorker) {
    actions.push(
      /*
        Raising a child from here rather than from the blank form: the parent is
        the context, and a child created without it would not hold the parent
        open — which is the whole point of splitting the work.
      */
      <Link key="child" href={`${ROUTES.newRequest}?parent=${request.id}`}>
        <Button>{messages.requestDetail.addChild}</Button>
      </Link>,
      ...(request.hasReceiverForm
        ? []
        : [
            <Button
              key="complete"
              type="primary"
              loading={busy === "complete"}
              onClick={() =>
                void run("complete", () => completeRequest(request.id))
              }
            >
              {messages.requestDetail.complete}
            </Button>,
          ]),
    );
  }

  if (request.status === "on_hold" && isWorker) {
    actions.push(
      <Button
        key="resume"
        loading={busy === "resume"}
        onClick={() => void run("resume", () => resumeRequest(request.id))}
      >
        {messages.requestDetail.resume}
      </Button>,
    );
  }

  /*
    H2.2 ข้อ 4 — the decision is taken on the request itself, not in a separate
    queue. The approver is looking at what they are approving, which is the one
    place the form, the documents and the chain are all on screen.
  */
  if (request.status === "pending_approval" && isApprover) {
    actions.push(
      <Button key="approve" type="primary" onClick={() => setAsking("approve")}>
        {messages.requestDetail.approve}
      </Button>,
      <Button key="reject" danger onClick={() => setAsking("reject")}>
        {messages.requestDetail.reject}
      </Button>,
      <Button key="send-back" onClick={() => setAsking("return")}>
        {messages.requestDetail.returnToRequester}
      </Button>,
    );
  }

  if (request.status === "approved" && isRequester) {
    actions.push(
      <Button key="close" type="primary" onClick={() => setAsking("close")}>
        {messages.requestDetail.close}
      </Button>,
    );
  }

  // H2.2 ข้อ 6 — available at every step, to whoever is carrying the request.
  if (
    (isRequester || isWorker) &&
    !["closed", "cancelled", "rejected"].includes(request.status)
  ) {
    actions.push(
      <Button key="cancel" danger onClick={() => setAsking("cancel")}>
        {messages.requestDetail.cancel}
      </Button>,
    );
  }

  if (!actions.length && !error) return null;

  return (
    <div className="space-y-2">
      {error && <Alert type="error" showIcon title={error} />}
      {actions.length > 0 && <Space wrap>{actions}</Space>}

      <ReasonDialog
        action={asking}
        busy={busy !== null}
        reasons={request.returnReasons ?? []}
        returnToRequester={request.status !== "pending_approval"}
        onCancel={() => setAsking(null)}
        onConfirm={async (note, reasonCode) => {
          const action = asking;
          if (!action) return;

          setAsking(null);

          await run(action, () => {
            switch (action) {
              case "approve":
              case "reject":
                return decideCase(request.approvalCaseId ?? "", {
                  decision: action === "approve" ? "approve" : "reject",
                  note,
                });
              case "return":
                return request.status === "pending_approval"
                  ? decideCase(request.approvalCaseId ?? "", {
                      decision: "return",
                      note,
                    })
                  : returnRequest(request.id, {
                      // `reason_code`, singular. This read `reason_codes: []`
                      // — a field the API has never had — so every return of a
                      // request that was not awaiting approval answered 400.
                      reason_code: reasonCode ?? "",
                      note,
                    });
              case "hold":
                return holdRequest(request.id, { reason: note });
              case "close":
                return closeRequest(request.id, note || undefined);
              case "cancel":
              default:
                return cancelRequest(request.id, { reason: note });
            }
          });
        }}
      />
    </div>
  );
}

/** The moves that ask for a reason before they happen. */
type ReasonAction =
  | "approve"
  | "reject"
  | "return"
  | "hold"
  | "cancel"
  | "close";

/** Only closing may be done without saying anything — see `CloseRequestDto`. */
const OPTIONAL_NOTE: ReadonlySet<ReasonAction> = new Set(["close"]);

const ACTION_TITLE: Record<ReasonAction, string> = {
  approve: messages.requestDetail.approve,
  reject: messages.requestDetail.reject,
  return: messages.requestDetail.returnToRequester,
  hold: messages.requestDetail.hold,
  cancel: messages.requestDetail.cancel,
  close: messages.requestDetail.close,
};

/**
 * Asks for the reason before the move, not after it.
 *
 * The backend refuses every one of these without a note — approvals included
 * since 1 Sep 2026 — so a button that fired first and reported `VALIDATION_
 * FAILED` afterwards would be teaching the rule through an error message.
 */
function ReasonDialog({
  action,
  busy,
  reasons,
  returnToRequester,
  onCancel,
  onConfirm,
}: {
  readonly action: ReasonAction | null;
  readonly busy: boolean;
  /**
   * REQ-04's standard bounce causes, from the type. Only `return` uses them.
   *
   * Empty means the type declares none, which the backend treats as "nothing
   * may be returned" — said on screen rather than met as a 400.
   */
  readonly reasons: readonly CodedLabel[];
  /**
   * Whether "ตีกลับ" sends the request back to its requester (`REQ-04`) or
   * merely returns the approval decision to the doing team.
   *
   * The two are different endpoints with different rules, and only the first
   * asks for a coded reason.
   */
  readonly returnToRequester: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (
    note: string,
    reasonCode?: string,
  ) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState<string | undefined>();

  const optional = action ? OPTIONAL_NOTE.has(action) : false;
  /*
    Returning a request to its requester needs a code as well as a remark:
    REQ-04 exists so "why do requests bounce?" can be counted, and free text
    alone cannot be. Returning a *decision* is a different move — it goes
    through the approval case, which asks only for the remark.
  */
  const needsReason = action === "return" && returnToRequester;
  const ready =
    (optional || note.trim().length > 0) && (!needsReason || Boolean(reasonCode));

  function reset() {
    setNote("");
    setReasonCode(undefined);
  }

  return (
    <Modal
      open={Boolean(action)}
      title={action ? ACTION_TITLE[action] : ""}
      okText={action ? ACTION_TITLE[action] : ""}
      cancelText={messages.org.confirmCancel}
      confirmLoading={busy}
      okButtonProps={{ disabled: !ready }}
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => {
        const values = [note, reasonCode] as const;
        reset();
        void onConfirm(values[0], values[1]);
      }}
      destroyOnHidden
    >
      {needsReason && (
        <div className="mb-2">
          <Text strong className="mb-1 block">
            {messages.requestDetail.returnReasonLabel}
          </Text>
          <SearchSelect
            className="w-full"
            value={reasonCode}
            onChange={(value) => setReasonCode(value as string)}
            placeholder={messages.requestDetail.returnReasonPlaceholder}
            options={reasons.map((reason) => ({
              value: reason.code,
              label: reason.name || reason.code,
            }))}
            notFoundContent={messages.requestDetail.returnReasonMissing}
          />
        </div>
      )}

      <Input.TextArea
        rows={4}
        autoFocus
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={
          optional
            ? messages.requestDetail.noteOptional
            : messages.requestDetail.reasonLabel
        }
      />
      {!optional && !note.trim() && (
        <Text type="secondary" className="mt-1 block text-xs">
          {messages.requestDetail.reasonRequired}
        </Text>
      )}
      {needsReason && !reasons.length && (
        <Text type="danger" className="mt-1 block text-xs">
          {messages.requestDetail.returnReasonMissing}
        </Text>
      )}
    </Modal>
  );
}

/** Hands the ticket to somebody else without changing its state. */
export function AssignDialog({
  requestId,
  people,
  open,
  onClose,
}: {
  readonly requestId: string;
  readonly people: { id: string; displayName: string; username: string }[];
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const router = useRouter();
  const [assignee, setAssignee] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!assignee) return;

    setBusy(true);
    setError(null);

    const result = await assignRequest(requestId, { assignee_user_id: assignee });

    setBusy(false);

    if (result.ok) {
      onClose();
      router.refresh();
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.requestDetail.assign}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={busy}
      okButtonProps={{ disabled: !assignee }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}

      <SearchSelect
        className="w-full"
        value={assignee}
        onChange={setAssignee}
        placeholder={messages.requestDetail.assignPlaceholder}
        options={people.map((person) => ({
          value: person.id,
          label: `${person.displayName} · ${person.username}`,
        }))}
      />
    </Modal>
  );
}
