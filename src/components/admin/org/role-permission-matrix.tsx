"use client";

import { Checkbox, Tooltip } from "antd";
import Text from "antd/es/typography/Text";
import { messages, thaiForPermission } from "@/lib/messages";
import { MATRIX_ACTIONS, matrixRows } from "./permission-matrix";

interface Props {
  readonly codes: readonly string[];
  readonly checked: readonly string[];
  /** a box that would break §5.4 for this role — locked unless already ticked */
  readonly isForbidden: (code: string) => boolean;
  readonly onToggle: (code: string, on: boolean) => void;
}

const GRID = "grid grid-cols-[minmax(0,1fr)_repeat(3,4.5rem)] items-center gap-x-2";

/** One module's permissions as rows of sub-modules × read / company-wide / manage. */
export function RolePermissionMatrix({ codes, checked, isForbidden, onToggle }: Props) {
  const rows = matrixRows(codes);
  const { actions, rows: rowLabels, noCell } = messages.roleAdmin.matrix;

  function box(code: string, label: string) {
    const forbidden = isForbidden(code);
    const on = checked.includes(code);
    // ล็อกเฉพาะช่องที่ยังไม่ติ๊ก — ช่องที่ติ๊กค้างอยู่ต้องเอาออกได้ ไม่อย่างนั้นแก้ role ให้ถูกไม่ได้
    const locked = forbidden && !on;
    const conflicting = forbidden && on;

    return (
      <Tooltip
        key={code}
        title={
          <>
            <code className="text-xs">{code}</code>
            <div>{thaiForPermission(code)}</div>
            {forbidden && <div>{messages.roleAdmin.adminLockedHint}</div>}
          </>
        }
      >
        <Checkbox
          checked={on}
          disabled={locked}
          aria-label={`${label} ${code}`}
          className={conflicting ? "rounded outline outline-red-400" : undefined}
          onChange={(event) => onToggle(code, event.target.checked)}
        >
          {label || null}
        </Checkbox>
      </Tooltip>
    );
  }

  return (
    <div className="mt-2">
      <div className={`${GRID} pb-1`}>
        <span />
        {MATRIX_ACTIONS.map((action) => (
          <Text key={action} type="secondary" className="text-center text-xs">
            {actions[action]}
          </Text>
        ))}
      </div>

      <ul className="divide-y divide-black/5">
        {rows.map((row) => {
          const name = rowLabels[row.key] ?? row.key;

          return (
            <li key={row.key} className="py-1.5">
              <div className={GRID}>
                <span className="min-w-0 truncate">{name}</span>
                {MATRIX_ACTIONS.map((action) => {
                  const code = row.cells[action];
                  return (
                    <span key={action} className="flex justify-center">
                      {code ? (
                        box(code, "")
                      ) : (
                        <Text type="secondary">{noCell}</Text>
                      )}
                    </span>
                  );
                })}
              </div>

              {row.chips.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {row.chips.map((code) =>
                    box(code, thaiForPermission(code) || code.slice(row.key.length + 1)),
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
