"use client";

import { useState } from "react";
import { Button, Drawer, Grid, Input, Modal } from "antd";
import Text from "antd/es/typography/Text";
import type { CodedLabel } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";

/**
 * The confirm dialog every state-changing move goes through.
 *
 * Lifted out of `request-actions.tsx` on 4 ก.ย. 2569, when the same buttons
 * appeared in the list rows of งานค้างของฉัน and งานทั้งหมด. A second copy
 * would drift: the note is mandatory for every action but `close`, and a copy
 * that forgot it would fire and report `VALIDATION_FAILED` afterwards.
 */

/** The moves that ask for a reason before they happen. */
export type ReasonAction =
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
export function ReasonDialog({
  action,
  busy,
  reasons,
  returnToRequester,
  returnLabel,
  approveNoteOptional = false,
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
  /** Overrides the `return` title, e.g. who a send-back goes to. */
  readonly returnLabel?: string;
  /** The approval level lets `approve` go without a note. */
  readonly approveNoteOptional?: boolean;
  readonly onCancel: () => void;
  /** Resolves true on success; the dialog keeps what was typed until then. */
  readonly onConfirm: (note: string, reasonCode?: string) => boolean | Promise<boolean>;
}) {
  const screens = Grid.useBreakpoint();
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState<string | undefined>();

  const optional = action
    ? OPTIONAL_NOTE.has(action) || (action === "approve" && approveNoteOptional)
    : false;
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

  const title =
    action === "return" && returnLabel ? returnLabel : action ? ACTION_TITLE[action] : "";

  function cancel() {
    reset();
    onCancel();
  }

  async function confirm() {
    if (await onConfirm(note, reasonCode)) reset();
  }

  const content = (
    <>
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
    </>
  );

  // Phones get a bottom sheet: a centred modal leaves the keyboard covering the note.
  if (!screens.md) {
    return (
      <Drawer
        open={Boolean(action)}
        placement="bottom"
        size="auto"
        title={title}
        onClose={cancel}
        destroyOnHidden
        footer={
          <div className="flex gap-2">
            <Button block onClick={cancel}>
              {messages.org.confirmCancel}
            </Button>
            <Button
              block
              type="primary"
              loading={busy}
              disabled={!ready}
              onClick={() => void confirm()}
            >
              {title}
            </Button>
          </div>
        }
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      open={Boolean(action)}
      title={title}
      okText={title}
      cancelText={messages.org.confirmCancel}
      confirmLoading={busy}
      okButtonProps={{ disabled: !ready }}
      onCancel={cancel}
      onOk={confirm}
      destroyOnHidden
    >
      {content}
    </Modal>
  );
}
