"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Collapse, Empty, Input, Switch } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";

const m = messages.integrations.picker;

export interface PickerGroup {
  readonly key: string;
  readonly label: string;
  readonly codes: readonly string[];
}

/**
 * รายการติ๊กที่ยาว (scope ของกุญแจ, event ของ webhook) — ค้นได้ทั้ง code และคำอธิบาย,
 * พับเป็นกลุ่ม, ติ๊กทั้งกลุ่มได้. ค้นแล้วซ่อนแค่ตัวที่ไม่ตรง ค่าที่ติ๊กไว้ไม่หาย.
 */
export function GroupedPicker({
  groups,
  describe,
  value,
  onChange,
  searchPlaceholder,
}: {
  readonly groups: readonly PickerGroup[];
  readonly describe: (code: string) => string;
  readonly value: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly searchPlaceholder: string;
}) {
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  // กลุ่มที่มีของติ๊กอยู่เปิดไว้ตั้งแต่แรก — แก้กุญแจเดิมแล้วเห็นสิ่งที่มันถืออยู่ทันที
  const [open, setOpen] = useState<string[]>(() =>
    groups
      .filter((group) => group.codes.some((code) => value.includes(code)))
      .map((group) => group.key),
  );

  const chosen = useMemo(() => new Set(value), [value]);
  const total = groups.reduce((sum, group) => sum + group.codes.length, 0);
  const needle = query.trim().toLowerCase();
  const filtering = needle.length > 0 || onlySelected;

  const visible = groups
    .map((group) => ({
      ...group,
      shown: group.codes.filter(
        (code) =>
          (!onlySelected || chosen.has(code)) &&
          (!needle ||
            code.toLowerCase().includes(needle) ||
            describe(code).toLowerCase().includes(needle)),
      ),
    }))
    .filter((group) => group.shown.length > 0);

  function set(codes: readonly string[], on: boolean) {
    const next = new Set(chosen);
    for (const code of codes) {
      if (on) next.add(code);
      else next.delete(code);
    }
    onChange([...next]);
  }

  return (
    <div className="mt-2 rounded-lg border border-[var(--app-border)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--app-border)] p-2">
        <Input.Search
          allowClear
          size="small"
          className="min-w-0 flex-1 basis-48"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-1 text-xs">
          <Switch size="small" checked={onlySelected} onChange={setOnlySelected} />
          {m.onlySelected}
        </label>
      </div>

      <div className="max-h-[45vh] overflow-y-auto">
        {visible.length === 0 ? (
          <Empty
            className="my-6"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={m.noMatch}
          />
        ) : (
          <Collapse
            ghost
            size="small"
            // ค้นอยู่ = เปิดทุกกลุ่มที่เจอ ไม่ให้ผลลัพธ์ซ่อนอยู่ในกลุ่มที่พับไว้
            activeKey={filtering ? visible.map((group) => group.key) : open}
            onChange={(keys) => setOpen(Array.isArray(keys) ? keys : [keys])}
            items={visible.map((group) => {
              const picked = group.codes.filter((code) => chosen.has(code)).length;
              return {
                key: group.key,
                label: (
                  <span className="text-sm font-medium">
                    {group.label}{" "}
                    <Text type="secondary" className="text-xs font-normal">
                      {picked}/{group.codes.length}
                    </Text>
                  </span>
                ),
                extra: (
                  // คลิก checkbox ทั้งกลุ่มต้องไม่พับ/กางกลุ่ม
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={picked === group.codes.length}
                      indeterminate={picked > 0 && picked < group.codes.length}
                      onChange={(e) => set(group.shown, e.target.checked)}
                    >
                      <span className="text-xs">{m.groupAll}</span>
                    </Checkbox>
                  </span>
                ),
                children: (
                  <div className="grid gap-1 pl-1">
                    {group.shown.map((code) => (
                      <Checkbox
                        key={code}
                        checked={chosen.has(code)}
                        onChange={(e) => set([code], e.target.checked)}
                      >
                        <span className="text-sm">{describe(code) || code}</span>
                        {describe(code) && (
                          <code className="ml-2 text-xs text-[var(--app-text-muted)]">
                            {code}
                          </code>
                        )}
                      </Checkbox>
                    ))}
                  </div>
                ),
              };
            })}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--app-border)] px-3 py-1.5">
        <Text type="secondary" className="text-xs">
          {m.selected(value.length, total)}
        </Text>
        <Button
          type="link"
          size="small"
          disabled={value.length === 0}
          onClick={() => onChange([])}
        >
          {m.clear}
        </Button>
      </div>
    </div>
  );
}
