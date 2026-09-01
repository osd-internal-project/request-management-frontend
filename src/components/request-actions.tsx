"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Input, Modal, Space, message } from "antd";
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
  };
  readonly viewerId: string;
}) {
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
        onCancel={() => setAsking(null)}
        onConfirm={async (note) => {
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
                      reason_codes: [],
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
  onCancel,
  onConfirm,
}: {
  readonly action: ReasonAction | null;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (note: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");

  const optional = action ? OPTIONAL_NOTE.has(action) : false;
  const ready = optional || note.trim().length > 0;

  return (
    <Modal
      open={Boolean(action)}
      title={action ? ACTION_TITLE[action] : ""}
      okText={action ? ACTION_TITLE[action] : ""}
      cancelText={messages.org.confirmCancel}
      confirmLoading={busy}
      okButtonProps={{ disabled: !ready }}
      onCancel={() => {
        setNote("");
        onCancel();
      }}
      onOk={() => {
        const value = note;
        setNote("");
        void onConfirm(value);
      }}
      destroyOnHidden
    >
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
      {!optional && !ready && (
        <Text type="secondary" className="mt-1 block text-xs">
          {messages.requestDetail.reasonRequired}
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
