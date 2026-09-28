"use client";

import { Checkbox, InputNumber } from "antd";
import Text from "antd/es/typography/Text";
import {
  DEFAULT_SEVERITY_TARGETS,
  REQUEST_SEVERITIES,
  type SeverityTargets,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.severity;

/**
 * CD-67 — makes a type a case type: a response and a resolution target per
 * severity. Unticked = not a case (null). The backend checks the numbers
 * (response ≤ resolution, a worse level never gets more time) and says why.
 */
export function SeverityTargetsEditor({
  value,
  onChange,
}: {
  readonly value: SeverityTargets | null;
  readonly onChange: (next: SeverityTargets | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Checkbox
        checked={value !== null}
        onChange={(event) =>
          onChange(event.target.checked ? DEFAULT_SEVERITY_TARGETS : null)
        }
      >
        {m.caseToggle}
      </Checkbox>
      <Text type="secondary" className="block text-xs">
        {m.caseHint}
      </Text>

      {value && (
        <table className="text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-4 font-normal">{m.columnLevel}</th>
              <th className="pr-4 font-normal">{m.columnResponse}</th>
              <th className="font-normal">{m.columnResolution}</th>
            </tr>
          </thead>
          <tbody>
            {REQUEST_SEVERITIES.map((level) => (
              <tr key={level}>
                <td className="py-1 pr-4">{m.levels[level]}</td>
                {(["responseHours", "resolutionHours"] as const).map((key) => (
                  <td key={key} className="py-1 pr-4">
                    <InputNumber
                      className="w-24"
                      min={1}
                      value={value[level][key]}
                      onChange={(next) =>
                        onChange({
                          ...value,
                          [level]: { ...value[level], [key]: next ?? 0 },
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
