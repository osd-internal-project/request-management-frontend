"use client";

import { useMemo } from "react";
import { Alert, Button, Switch, Tag } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import type { RequestType, SubRequestTypeRule } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";

/** `คำขอย่อยที่ต้องสร้าง` — the child types a receiver raises under this type. */
export function SubRequestEditor({
  ownCode,
  entries,
  types,
  onChange,
}: {
  readonly ownCode: string | null;
  readonly entries: SubRequestTypeRule[];
  readonly types: readonly RequestType[];
  readonly onChange: (next: SubRequestTypeRule[]) => void;
}) {
  const nameOf = useMemo(
    () => new Map(types.map((type) => [type.code, type.name])),
    [types],
  );
  const addable = types
    .filter((type) => type.code !== ownCode)
    .filter((type) => !entries.some((entry) => entry.code === type.code))
    .map((type) => ({ value: type.code, label: `${type.code} · ${type.name}` }));

  function setRequired(index: number, required: boolean) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, required } : entry)));
  }

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title={messages.requestTypes.subRequestsNote} />

      {entries.length ? (
        <ul className="m-0 list-none p-0">
          {entries.map((entry, index) => (
            <li
              key={entry.code}
              className="flex items-center gap-3 border-b border-black/5 py-2"
            >
              <Tag className="m-0! font-mono">{entry.code}</Tag>
              <Text className="min-w-0 flex-1 truncate">
                {nameOf.get(entry.code) ?? messages.requestTypes.subRequestUnknown}
              </Text>
              <label className="flex items-center gap-2">
                <Switch
                  size="small"
                  checked={entry.required}
                  onChange={(checked) => setRequired(index, checked)}
                />
                <Text type={entry.required ? undefined : "secondary"}>
                  {messages.requestTypes.docRequired}
                </Text>
              </label>
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
        <Paragraph type="secondary" className="mb-0! text-xs">
          {messages.requestTypes.subRequestsEmpty}
        </Paragraph>
      )}

      <SearchSelect
        className="w-full max-w-md"
        value={null}
        placeholder={messages.requestTypes.subRequestAdd}
        options={addable}
        onChange={(code: string | null) => {
          if (code) onChange([...entries, { code, required: true }]);
        }}
      />
    </div>
  );
}
