"use client";

import { useState } from "react";
import { Button, Checkbox, Input, Modal, Space, Tag } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { isRequiredDoc, type CodedLabel, type RequiredDoc } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { useIndexedEditing } from "./use-indexed-editing";

/** `เอกสารบังคับ` — one line each, as §16 draws them. */
export function RequiredDocs({
  entries,
  onChange,
}: {
  readonly entries: RequiredDoc[];
  readonly onChange: (next: RequiredDoc[]) => void;
}) {
  const editor = useIndexedEditing(entries, onChange);

  return (
    <div>
      <Text strong>{messages.requestTypes.docs}</Text>

      {entries.length ? (
        <ul className="mt-2 m-0 list-none p-0">
          {entries.map((entry, index) => (
            <li
              key={entry.code || index}
              className="flex items-center gap-2 border-b border-black/5 py-1.5"
            >
              <button
                type="button"
                onClick={() => editor.openAt(index)}
                className="min-w-0 cursor-pointer truncate text-left font-semibold hover:underline"
              >
                {entry.name || entry.code}
              </button>
              <Tag color={isRequiredDoc(entry) ? "red" : "default"}>
                {isRequiredDoc(entry)
                  ? messages.requestTypes.docRequired
                  : messages.requestTypes.docOptional}
              </Tag>
              <span className="flex-1" />
              <Button
                size="small"
                type="link"
                danger
                onClick={() => onChange(entries.filter((_, i) => i !== index))}
              >
                {messages.requestTypes.remove}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Paragraph type="secondary" className="mt-1! mb-0! text-xs">
          {messages.requestTypes.docsEmpty}
        </Paragraph>
      )}

      <Button type="link" className="mt-1 px-0!" onClick={editor.openNew}>
        {messages.requestTypes.addDoc}
      </Button>

      <CodedLabelDialog
        key={editor.dialogKey}
        open={editor.open}
        entry={editor.current}
        withRequired
        onClose={editor.close}
        onSave={editor.save}
      />
    </div>
  );
}

/** `เหตุผลตีกลับมาตรฐาน` — §16 draws these as pills, not as rows. */
export function ReturnReasons({
  entries,
  onChange,
}: {
  readonly entries: CodedLabel[];
  readonly onChange: (next: CodedLabel[]) => void;
}) {
  const editor = useIndexedEditing(entries, onChange);

  return (
    <div>
      <Text strong>{messages.requestTypes.reasons}</Text>
      <Paragraph type="secondary" className="mt-1! mb-2! text-xs">
        {messages.requestTypes.reasonsNote}
      </Paragraph>

      <div className="flex flex-wrap items-center gap-2">
        {entries.map((entry, index) => (
          <Tag
            key={entry.code || index}
            closable
            className="m-0! cursor-pointer"
            onClick={() => editor.openAt(index)}
            onClose={(event) => {
              event.preventDefault();
              // The × is inside the pill, so its click would otherwise reach
              // the pill's own onClick and open the entry just removed.
              event.stopPropagation();
              onChange(entries.filter((_, i) => i !== index));
            }}
          >
            {entry.name || entry.code}
          </Tag>
        ))}

        <Tag
          className="m-0! cursor-pointer border-dashed"
          onClick={editor.openNew}
        >
          {messages.requestTypes.addReason}
        </Tag>
      </div>

      <CodedLabelDialog
        key={editor.dialogKey}
        open={editor.open}
        entry={editor.current}
        onClose={editor.close}
        onSave={editor.save}
      />
    </div>
  );
}

/**
 * `เอกสารบังคับ` and `เหตุผลตีกลับมาตรฐาน` are the same shape and the same
 * rules, so they share an editor. The code stays visible and editable because
 * REQ-03 blocks a submit by code and REQ-04 counts bounces by code.
 */
function CodedLabelDialog({
  open,
  entry,
  withRequired = false,
  onClose,
  onSave,
}: {
  readonly open: boolean;
  readonly entry: RequiredDoc | null;
  /** Documents only: offers the บังคับ/ไม่บังคับ switch. */
  readonly withRequired?: boolean;
  readonly onClose: () => void;
  readonly onSave: (entry: RequiredDoc) => void;
}) {
  const [draft, setDraft] = useState<RequiredDoc>(
    entry ??
      (withRequired
        ? { code: "", name: "", required: true }
        : { code: "", name: "" }),
  );

  function set(patch: Partial<RequiredDoc>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={
        entry
          ? messages.requestTypes.entryEditTitle
          : messages.requestTypes.entryAddTitle
      }
      onCancel={onClose}
      onOk={() => onSave(draft)}
      okButtonProps={{ disabled: !draft.code.trim() || !draft.name.trim() }}
    >
      <Space orientation="vertical" className="flex">
        <label className="block">
          <Text strong>{messages.requestTypes.entryCode}</Text>
          <Input
            className="mt-1"
            value={draft.code}
            onChange={(event) => set({ code: event.target.value.toUpperCase() })}
          />
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.entryLabel}</Text>
          <Input
            className="mt-1"
            value={draft.name}
            onChange={(event) => set({ name: event.target.value })}
          />
        </label>

        {withRequired && (
          <Checkbox
            checked={isRequiredDoc(draft)}
            onChange={(event) => set({ required: event.target.checked })}
          >
            {messages.requestTypes.docRequiredToggle}
          </Checkbox>
        )}
      </Space>
    </Modal>
  );
}
