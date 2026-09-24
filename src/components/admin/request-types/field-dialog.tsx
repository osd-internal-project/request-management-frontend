"use client";

import { useState } from "react";
import { Button, Checkbox, Input, InputNumber, Modal, Select, Space } from "antd";
import Text from "antd/es/typography/Text";
import type { FieldKind } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";
import {
  COLUMN_TYPES,
  EMPTY_FIELD,
  FIELD_TYPES,
  type FieldRow,
} from "./schema-rows";
import { useIndexedEditing } from "./use-indexed-editing";

/** Edits one form field — or, with `columnsOnly`, one column of a table field. */
export function FieldDialog({
  open,
  row,
  columnsOnly = false,
  onClose,
  onSave,
  onRemove,
}: {
  readonly open: boolean;
  readonly row: FieldRow | null;
  /**
   * Editing a column of a table rather than a field of the form.
   *
   * Narrows the type list — a table inside a table is refused by the backend,
   * cannot be drawn by the grid, and is only masked one level deep.
   */
  readonly columnsOnly?: boolean;
  readonly onClose: () => void;
  readonly onSave: (row: FieldRow) => void;
  readonly onRemove?: () => void;
}) {
  // Seeded at mount; the caller keys this component per opening so a new
  // selection arrives as a remount rather than as a stale draft.
  const [draft, setDraft] = useState<FieldRow>(row ?? EMPTY_FIELD);

  function set(patch: Partial<FieldRow>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={
        row
          ? messages.requestTypes.fieldEditTitle
          : messages.requestTypes.fieldAddTitle
      }
      onCancel={onClose}
      onOk={() => onSave(draft)}
      okButtonProps={{
        disabled:
          !draft.key.trim() ||
          (draft.type === "select" && !draft.options?.length),
      }}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center">
          {onRemove && (
            <Button type="link" danger onClick={onRemove}>
              {messages.requestTypes.remove}
            </Button>
          )}
          <span className="flex-1" />
          <Space>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      )}
    >
      <Space orientation="vertical" size="middle" className="flex">
        <label className="block">
          <Text strong>{messages.requestTypes.fieldName}</Text>
          <Input
            className="mt-1"
            value={draft.key}
            onChange={(event) => set({ key: event.target.value })}
          />
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.fieldTitle}</Text>
          <Input
            className="mt-1"
            value={draft.title}
            onChange={(event) => set({ title: event.target.value })}
          />
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.fieldType}</Text>
          <SearchSelect
            className="mt-1 w-full"
            value={draft.type}
            onChange={(next: FieldKind) =>
              // multiline belongs to text only; drop it so it cannot ride along unseen.
              set({ type: next, multiline: next === "text" && draft.multiline })
            }
            options={(columnsOnly ? COLUMN_TYPES : FIELD_TYPES).map(
              (value) => ({
                value,
                label: messages.requestTypes.fieldTypeLabels[value],
              }),
            )}
          />
        </label>

        {draft.type === "select" && (
          <label className="block">
            <Text strong>{messages.requestTypes.fieldOptions}</Text>
            <Select
              className="mt-1 w-full"
              mode="tags"
              open={false}
              tokenSeparators={[","]}
              value={draft.options ?? []}
              onChange={(next: string[]) =>
                set({
                  options: [
                    ...new Set(next.map((option) => option.trim()).filter(Boolean)),
                  ],
                })
              }
              placeholder={messages.requestTypes.fieldOptionsHint}
            />
          </label>
        )}

        {draft.type === "boolean" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Text strong>{messages.requestTypes.fieldTrueLabel}</Text>
              <Input
                className="mt-1"
                value={draft.trueLabel ?? ""}
                placeholder={messages.requestTypes.fieldTruePlaceholder}
                onChange={(event) => set({ trueLabel: event.target.value })}
              />
            </label>
            <label className="block">
              <Text strong>{messages.requestTypes.fieldFalseLabel}</Text>
              <Input
                className="mt-1"
                value={draft.falseLabel ?? ""}
                placeholder={messages.requestTypes.fieldFalsePlaceholder}
                onChange={(event) => set({ falseLabel: event.target.value })}
              />
            </label>
          </div>
        )}

        <Space wrap>
          <Checkbox
            checked={draft.required}
            onChange={(event) => set({ required: event.target.checked })}
          >
            {messages.requestTypes.fieldRequired}
          </Checkbox>
          <Checkbox
            checked={draft.sensitive}
            onChange={(event) => set({ sensitive: event.target.checked })}
          >
            {messages.requestTypes.fieldSensitive}
          </Checkbox>
          {/* A table has no single value to make long, and a column is drawn
              in a grid cell — neither has anywhere to put a textarea. */}
          {draft.type === "text" && !columnsOnly && (
            <Checkbox
              checked={draft.multiline}
              onChange={(event) => set({ multiline: event.target.checked })}
            >
              {messages.requestTypes.fieldMultiline}
            </Checkbox>
          )}
        </Space>

        {draft.type === "table" && (
          <>
            <label className="block">
              <Text strong>{messages.requestTypes.tableMaxRows}</Text>
              <InputNumber
                className="mt-1 w-32"
                min={1}
                value={draft.maxItems ?? undefined}
                onChange={(next) => set({ maxItems: next ?? null })}
                placeholder={messages.requestTypes.tableNoCap}
              />
              <Text type="secondary" className="block text-xs">
                {messages.requestTypes.tableMaxRowsHint}
              </Text>
            </label>

            {/*
              The columns, edited by this very dialog one level down. Reusing it
              is what keeps a column and a field the same shape — and
              `columnsOnly` is what stops somebody nesting a table in a table,
              which nothing downstream can draw or mask.
            */}
            <TableColumns
              rows={draft.columns ?? []}
              onChange={(columns) => set({ columns })}
            />
          </>
        )}
      </Space>
    </Modal>
  );
}

/** The column list inside a table field — the same editor, one level down. */
function TableColumns({
  rows,
  onChange,
}: {
  readonly rows: FieldRow[];
  readonly onChange: (next: FieldRow[]) => void;
}) {
  const editor = useIndexedEditing(rows, onChange);

  return (
    <div>
      <Text strong>{messages.requestTypes.tableColumns}</Text>

      <ul className="mt-2 m-0 list-none p-0">
        {rows.map((row, index) => (
          <li
            key={`${row.key}-${index}`}
            className="flex items-center justify-between border-b border-black/5 py-1"
          >
            <span>
              {row.title || row.key}{" "}
              <Text type="secondary" className="text-xs">
                {messages.requestTypes.columnSummary(
                  row.key,
                  messages.requestTypes.fieldTypeLabels[row.type],
                  row.required,
                )}
              </Text>
            </span>
            <Button size="small" type="link" onClick={() => editor.openAt(index)}>
              {messages.requestTypes.tableEditColumn}
            </Button>
          </li>
        ))}
        {!rows.length && (
          <li className="py-1">
            <Text type="secondary">{messages.requestTypes.tableNoColumns}</Text>
          </li>
        )}
      </ul>

      <Button size="small" className="mt-2" onClick={editor.openNew}>
        {messages.requestTypes.tableAddColumn}
      </Button>

      <FieldDialog
        key={editor.dialogKey}
        open={editor.open}
        columnsOnly
        row={editor.current}
        onClose={editor.close}
        onSave={editor.save}
        onRemove={editor.remove}
      />
    </div>
  );
}
