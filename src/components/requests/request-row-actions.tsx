"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Space } from "antd";
import {
  cancelRequest,
  closeRequest,
  completeRequest,
  decideCase,
  receiveRequest,
  resumeRequest,
  returnRequest,
} from "@/lib/api/client-requests";
import { ReasonDialog, type ReasonAction } from "@/components/requests/reason-dialog";
import type { RequestRow } from "@/lib/api/types";
import type { Session } from "@/lib/session-shape";
import { can } from "@/lib/session-shape";
import { messages } from "@/lib/messages";

/**
 * The moves offered from a list row, in the order they read on screen.
 *
 * A deliberate subset of what `available_actions` can contain. `submit`,
 * `assign` and `create_child` all need a form or a second screen, and a button
 * in a table cell that only ever opens the detail page is a worse version of
 * clicking the row.
 */
const ROW_ACTIONS = [
  "receive",
  "complete",
  "resume",
  "approve",
  "reject",
  "send_back",
  "return",
  "close",
  "cancel",
] as const;

type RowAction = (typeof ROW_ACTIONS)[number];

/**
 * The permission each move needs, matching the `@Permissions()` on its route.
 *
 * The second of two gates, and the weaker one. `available_actions` already
 * says whether this person holds the *authority* over this row; this says
 * whether their role may perform the move at all. Both have to pass, because
 * they answer different questions and the backend checks both.
 */
const PERMISSION_FOR: Record<RowAction, string> = {
  receive: "request.complete",
  complete: "request.complete",
  resume: "request.hold",
  approve: "approval.decide",
  reject: "approval.decide",
  send_back: "approval.decide",
  return: "request.return",
  close: "request.create",
  cancel: "request.cancel.own",
};

const LABEL_FOR: Record<RowAction, string> = {
  receive: messages.requestDetail.receive,
  complete: messages.requestDetail.complete,
  resume: messages.requestDetail.resume,
  approve: messages.requestDetail.approve,
  reject: messages.requestDetail.reject,
  send_back: messages.requestDetail.returnToRequester,
  return: messages.requestDetail.returnToRequester,
  close: messages.requestDetail.close,
  cancel: messages.requestDetail.cancel,
};

/** The moves that go straight through; everything else asks for a reason. */
const IMMEDIATE: ReadonlySet<RowAction> = new Set(["receive", "complete", "resume"]);

/**
 * The action buttons on one row of งานค้างของฉัน / งานทั้งหมด.
 *
 * งานทั้งหมด was read-only until 4 ก.ย. 2569, on the argument that a button
 * offered beside somebody else's ticket is a button that answers 403. That was
 * true while the frontend had to guess who could do what. It no longer guesses:
 * `available_actions` is computed by the same `availableActions()` that
 * `assertMayAct` consults, so the row is offered exactly the moves the handler
 * will accept.
 *
 * Hiding a control is still convenience, never access control (ROLE-01) — the
 * backend re-checks every one of these.
 */
export function RequestRowActions({
  row,
  session,
}: {
  readonly row: RequestRow;
  readonly session: Session | null;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<RowAction | null>(null);
  const [asking, setAsking] = useState<RowAction | null>(null);

  const offered = ROW_ACTIONS.filter(
    (action) =>
      (row.available_actions ?? []).includes(action) &&
      can(session, PERMISSION_FOR[action]),
  );

  if (!offered.length) return null;

  const caseId = row.approvalCases?.[0]?.id ?? "";

  async function run(
    action: RowAction,
    call: () => Promise<{ ok: boolean; message?: string }>,
  ) {
    setBusy(action);
    const result = await call();
    setBusy(null);

    if (!result.ok) {
      void message.error(result.message ?? messages.common.loadError);
      return;
    }

    void message.success(messages.requestDetail.actionDone);
    router.refresh();
  }

  function perform(action: RowAction, note: string, reasonCode?: string) {
    switch (action) {
      case "receive":
        return run(action, () => receiveRequest(row.id));
      case "complete":
        return run(action, () => completeRequest(row.id));
      case "resume":
        return run(action, () => resumeRequest(row.id));
      case "approve":
      case "reject":
        return run(action, () =>
          decideCase(caseId, {
            decision: action === "approve" ? "approve" : "reject",
            note,
          }),
        );
      /*
        `send_back` is the decider's move on a case; `return` is the carrier's
        on the request itself. They land on the same label because they mean
        the same thing to the reader, but they are different endpoints and
        sending one to the other answers 400.
      */
      case "send_back":
        return run(action, () => decideCase(caseId, { decision: "return", note }));
      case "return":
        return run(action, () =>
          returnRequest(row.id, { reason_code: reasonCode ?? "", note }),
        );
      case "close":
        return run(action, () => closeRequest(row.id, note || undefined));
      case "cancel":
        return run(action, () => cancelRequest(row.id, { reason: note }));
    }
  }

  return (
    /*
      The row itself navigates to the detail page. Without this the first click
      on any button would both fire the action and leave the list, so whatever
      the action reported would never be read.
    */
    <div onClick={(event) => event.stopPropagation()}>
      <Space size={4} wrap>
        {offered.map((action) => (
          <Button
            key={action}
            size="small"
            // type={action === "approve" || action === "receive" ? "primary" : "default"}
            type="link"
            danger={action === "reject" || action === "cancel"}
            loading={busy === action}
            onClick={() =>
              IMMEDIATE.has(action)
                ? void perform(action, "")
                : setAsking(action)
            }
          >
            {LABEL_FOR[action]}
          </Button>
        ))}
      </Space>

      <ReasonDialog
        action={asking ? (DIALOG_ACTION[asking] ?? null) : null}
        busy={busy !== null}
        reasons={[]}
        returnToRequester={asking === "return"}
        onCancel={() => setAsking(null)}
        onConfirm={async (note, reasonCode) => {
          const action = asking;
          if (!action) return;

          setAsking(null);
          await perform(action, note, reasonCode);
        }}
      />
    </div>
  );
}

/** The dialog knows one `return`; the row distinguishes two. */
const DIALOG_ACTION: Partial<Record<RowAction, ReasonAction>> = {
  approve: "approve",
  reject: "reject",
  send_back: "return",
  return: "return",
  close: "close",
  cancel: "cancel",
};
