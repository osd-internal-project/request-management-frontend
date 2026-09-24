"use client";

import { Button, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { FieldDialog } from "./field-dialog";
import { describeField, type FieldRow } from "./schema-rows";
import { useIndexedEditing } from "./use-indexed-editing";

/** `ฟิลด์ฟอร์ม (form schema)` — one line per field, edited in a dialog. */
export function FormSchemaEditor({
  rows,
  onChange,
}: {
  readonly rows: FieldRow[];
  readonly onChange: (next: FieldRow[]) => void;
}) {
  const editor = useIndexedEditing(rows, onChange);

  return (
    <div>
      <Text strong>{messages.requestTypes.fields}</Text>

      <ul className="mt-2 m-0 list-none space-y-2 p-0">
        {rows.map((row, index) => (
          <li key={`${row.key}-${index}`}>
            <button
              type="button"
              onClick={() => editor.openAt(index)}
              className="flex w-full cursor-pointer items-center gap-3 rounded border border-black/5 px-3 py-2 text-left hover:bg-black/[0.03]"
            >
              <span className="w-40 shrink-0 truncate font-semibold">
                {row.title || row.key}
              </span>

              <Text type="secondary" className="min-w-0 truncate text-xs">
                {describeField(row)}
              </Text>

              <span className="flex-1" />

              {row.required && (
                <Tag color="red" className="m-0!">
                  {messages.requestTypes.fieldRequired}
                </Tag>
              )}
              {row.sensitive && (
                <Tag color="blue" className="m-0!">
                  {messages.requestTypes.fieldRestricted}
                </Tag>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Button type="link" className="mt-1 px-0!" onClick={editor.openNew}>
        {messages.requestTypes.addField}
      </Button>

      {/*
        Keyed by which row is open: the draft is seeded at mount, and
        `destroyOnHidden` destroys the Modal body, not this component. Without
        the key, the second field opened would show the first one's values.
      */}
      <FieldDialog
        key={editor.dialogKey}
        open={editor.open}
        row={editor.current}
        onClose={editor.close}
        onSave={editor.save}
        onRemove={editor.remove}
      />
    </div>
  );
}
