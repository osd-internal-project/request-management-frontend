"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, App, Button, Modal, Space, Tooltip } from "antd";
import {
  assignRequest,
  cancelRequest,
  closeRequest,
  advanceRequest,
  completeRequest,
  decideCase,
  holdRequest,
  receiveRequest,
  resumeRequest,
  returnRequest,
} from "@/lib/api/client-requests";
import type { CodedLabel, FlowMoves } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";
import {
  ReasonDialog,
  type ReasonAction,
} from "@/components/requests/reason-dialog";
import { ROUTES } from "@/lib/routes";
import type { Session } from "@/lib/session-shape";
import { offeredActions } from "@/components/requests/action-permissions";

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
  session,
}: {
  readonly request: {
    id: string;
    status: string;
    /** From the backend's `availableActions` — see `offeredActions`. */
    available_actions?: string[];
    /** The open approval case, when the request is waiting on a decision. */
    approvalCaseId?: string | null;
    /** The type asks the receiver for a form — see `ReceiverForm`. */
    hasReceiverForm?: boolean;
    /**
     * REQ-04 — the bounce causes this request may be returned with, taken from
     * the snapshot it was raised under so the picker offers exactly what the
     * server will accept.
     */
    returnReasons?: readonly CodedLabel[];
    /** Required checklist sub requests not yet raised; blocks "ทำเสร็จแล้ว". */
    missingSubRequests?: number;
    /** Where the step flow may go from here; null when the type has no flow. */
    flowMoves?: FlowMoves | null;
    /** Step code → name, for labelling the step buttons. */
    stepNames?: Readonly<Record<string, string>>;
    /** The open case's subject, e.g. `request:X:pre`. */
    approvalStage?: string | null;
    /** The current approval level lets an approval go without a note. */
    approveNoteOptional?: boolean;
  };
  readonly session: Session | null;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Which reason dialog is open, if any. */
  const [asking, setAsking] = useState<ReasonAction | null>(null);

  // Offered moves come from the backend's `availableActions` — the table `assertMayAct` enforces.
  const offered = offeredActions(request.available_actions, session);

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
      // A toast too: the inline alert sits behind an open dialog.
      void message.error(result.message ?? messages.common.loadError);
    }
    return result.ok;
  }

  const actions: React.ReactNode[] = [];

  if (offered.has("receive")) {
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

  const moves = request.flowMoves ?? null;
  // Before the work a send-back goes to the requester; after it, or out of a step, to the team.
  const sendBackLabel =
    request.status === "pending_approval" && request.approvalStage
      ? request.approvalStage.endsWith(":pre")
        ? messages.requestDetail.sendBackToRequester
        : messages.requestDetail.sendBackToTeam
      : undefined;
  const stepName = (code: string) => request.stepNames?.[code] ?? code;

  const isV2 = moves?.schema_version === 2;

  if (offered.has("advance") && moves) {
    // v2: a `submitted` step goes forward by "รับเรื่อง"; `advance` only sends it back.
    if (moves.forward && !(isV2 && moves.scope === "submitted")) {
      const target = moves.forward;
      actions.push(
        <Button
          key="advance"
          type="primary"
          loading={busy === "advance"}
          onClick={() =>
            void run("advance", () => advanceRequest(request.id, target))
          }
        >
          {moves.requires_approval
            ? messages.requestDetail.flow.advanceForApproval(stepName(target))
            : messages.requestDetail.flow.advance(stepName(target))}
        </Button>,
      );
    }
    if (isV2 && moves.is_last && !moves.forward) {
      actions.push(
        <Button
          key="confirm-close"
          type="primary"
          loading={busy === "advance"}
          onClick={() =>
            void modal.confirm({
              title: messages.requestDetail.flow.confirmCloseTitle,
              content: messages.requestDetail.flow.confirmCloseBody,
              onOk: () => run("advance", () => advanceRequest(request.id, "END")),
            })
          }
        >
          {messages.requestDetail.flow.confirmClose}
        </Button>,
      );
    }
    for (const target of moves.backward) {
      actions.push(
        <Button
          key={`back-${target}`}
          onClick={() =>
            void modal.confirm({
              title: messages.requestDetail.flow.backConfirm(stepName(target)),
              content: messages.requestDetail.flow.backConfirmBody,
              onOk: () =>
                run("advance", () => advanceRequest(request.id, target)),
            })
          }
        >
          {messages.requestDetail.flow.back(stepName(target))}
        </Button>,
      );
    }
  }

  /*
    Raising a child from here rather than from the blank form: the parent is
    the context, and a child created without it would not hold the parent
    open — which is the whole point of splitting the work.
  */
  if (offered.has("complete") && offered.has("create_child")) {
    actions.push(
      <Link key="child" href={`${ROUTES.newRequest}?parent=${request.id}`}>
        <Button>{messages.requestDetail.addChild}</Button>
      </Link>,
    );
  }

  // On a flow, "ทำเสร็จแล้ว" belongs to the last step only.
  if (offered.has("complete") && (!moves || moves.is_last)) {
    actions.push(
      ...(request.hasReceiverForm
        ? []
        : [
            <Tooltip
              key="complete"
              title={
                request.missingSubRequests
                  ? messages.requestDetail.completeBlockedBySubRequests
                  : null
              }
            >
              <Button
                type="primary"
                loading={busy === "complete"}
                disabled={Boolean(request.missingSubRequests)}
                onClick={() =>
                  void run("complete", () => completeRequest(request.id))
                }
              >
                {messages.requestDetail.complete}
              </Button>
            </Tooltip>,
          ]),
    );
  }

  if (offered.has("hold")) {
    actions.push(
      <Button key="hold" onClick={() => setAsking("hold")}>
        {messages.requestDetail.hold}
      </Button>,
    );
  }

  if (offered.has("resume")) {
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
  if (offered.has("approve")) {
    actions.push(
      <Button key="approve" type="primary" onClick={() => setAsking("approve")}>
        {messages.requestDetail.approve}
      </Button>,
    );
  }
  if (offered.has("reject")) {
    actions.push(
      <Button key="reject" danger onClick={() => setAsking("reject")}>
        {messages.requestDetail.reject}
      </Button>,
    );
  }
  // `send_back` (approver) and `return` (carrier) never overlap: one needs pending_approval, the other not.
  if (offered.has("send_back") || offered.has("return")) {
    actions.push(
      <Button key="send-back" onClick={() => setAsking("return")}>
        {sendBackLabel ?? messages.requestDetail.returnToRequester}
      </Button>,
    );
  }

  if (offered.has("close")) {
    actions.push(
      <Button key="close" type="primary" onClick={() => setAsking("close")}>
        {messages.requestDetail.close}
      </Button>,
    );
  }

  // H2.2 ข้อ 6 — cancel; since A1 it also closes an open approval case.
  if (offered.has("cancel")) {
    actions.push(
      <Button key="cancel" danger onClick={() => setAsking("cancel")}>
        {messages.requestDetail.cancel}
      </Button>,
    );
  }

  if (!actions.length && !error) return null;

  return (
    // Phones: a bar pinned to the bottom, so the next move is always in reach.
    <div className="space-y-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:border-t max-md:border-black/10 max-md:bg-white max-md:p-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      {error && <Alert type="error" showIcon title={error} />}
      {actions.length > 0 && <Space wrap>{actions}</Space>}

      <ReasonDialog
        action={asking}
        busy={busy !== null}
        reasons={request.returnReasons ?? []}
        returnToRequester={request.status !== "pending_approval"}
        returnLabel={sendBackLabel}
        approveNoteOptional={request.approveNoteOptional}
        onCancel={() => setAsking(null)}
        onConfirm={async (note, reasonCode) => {
          const action = asking;
          if (!action) return false;

          const ok = await run(action, () => {
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
          if (ok) setAsking(null);
          return ok;
        }}
      />
    </div>
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
