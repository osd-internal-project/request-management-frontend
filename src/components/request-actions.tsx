"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Modal, Select, Space, message } from "antd";
import {
  assignRequest,
  closeRequest,
  completeRequest,
  receiveRequest,
} from "@/lib/api/client-requests";
import { messages } from "@/lib/messages";
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
  };
  readonly viewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRequester = request.requesterId === viewerId;
  const isReceiver = request.receiverUserId === viewerId;
  const isWorker = request.assigneeUserId === viewerId || isReceiver;

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
      <Button
        key="complete"
        type="primary"
        loading={busy === "complete"}
        onClick={() => void run("complete", () => completeRequest(request.id))}
      >
        {messages.requestDetail.complete}
      </Button>,
    );
  }

  if (request.status === "approved" && isRequester) {
    actions.push(
      <Button
        key="close"
        type="primary"
        loading={busy === "close"}
        onClick={() => void run("close", () => closeRequest(request.id))}
      >
        {messages.requestDetail.close}
      </Button>,
    );
  }

  if (!actions.length && !error) return null;

  return (
    <div className="space-y-2">
      {error && <Alert type="error" showIcon title={error} />}
      {actions.length > 0 && <Space wrap>{actions}</Space>}
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

      <Select
        className="w-full"
        showSearch
        optionFilterProp="label"
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
