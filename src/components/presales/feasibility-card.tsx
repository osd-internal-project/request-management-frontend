"use client";

import { Card, Input, Radio, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { FeasibilityVerdict } from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const mf = messages.presales.feasibility;

export const FEASIBILITY_COLOR: Record<string, string> = {
  unassessed: "default",
  feasible: "green",
  conditional: "gold",
  not_feasible: "red",
};

const VERDICTS: FeasibilityVerdict[] = [
  "feasible",
  "conditional",
  "not_feasible",
];

/**
 * CD-133 — ประเมินความเป็นไปได้: the version's overall verdict, required to
 * lock. Conditions and refusals must say why; "not feasible" can be locked
 * to record the outcome but not sent for approval.
 */
export function FeasibilityCard({
  verdict,
  note,
  editable,
  onChange,
}: {
  verdict: FeasibilityVerdict;
  note: string;
  editable: boolean;
  onChange: (verdict: FeasibilityVerdict, note: string) => void;
}) {
  return (
    <Card
      size="small"
      title={mf.title}
      extra={
        <Tag color={FEASIBILITY_COLOR[verdict]}>
          {mf.verdicts[verdict] ?? verdict}
        </Tag>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {mf.hint}
      </Text>
      {editable ? (
        <div className="space-y-2">
          <Radio.Group
            value={verdict === "unassessed" ? undefined : verdict}
            optionType="button"
            onChange={(event) =>
              onChange(event.target.value as FeasibilityVerdict, note)
            }
            options={VERDICTS.map((value) => ({
              value,
              label: mf.verdicts[value],
            }))}
          />
          <Input.TextArea
            value={note}
            maxLength={4000}
            autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder={mf.notePlaceholder[verdict] ?? ""}
            onChange={(event) => onChange(verdict, event.target.value)}
          />
        </div>
      ) : (
        <div className="whitespace-pre-wrap">{note || "—"}</div>
      )}
    </Card>
  );
}
