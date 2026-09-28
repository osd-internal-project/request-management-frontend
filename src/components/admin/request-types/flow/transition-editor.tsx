"use client";

import { Button, Checkbox, Input, Select } from "antd";
import Text from "antd/es/typography/Text";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  FLOW_CONDITION_OPS,
  type FlowCondition,
  type FlowConditionOp,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";
import type { ExitDraft, StepDraft } from "./flow-draft";

const t = messages.requestTypes.flow;

/** Forward exits of one step, tried top to bottom; the last one carries no condition. */
export function TransitionEditor({
  step,
  steps,
  fields,
  onChange,
}: {
  readonly step: StepDraft;
  readonly steps: readonly StepDraft[];
  readonly fields: readonly { value: string; label: string }[];
  readonly onChange: (forward: ExitDraft[]) => void;
}) {
  const targets = steps
    .filter((candidate) => candidate.code !== step.code)
    .map((candidate) => ({ value: candidate.code, label: candidate.name }));

  function patch(index: number, next: Partial<ExitDraft>) {
    onChange(step.forward.map((exit, i) => (i === index ? { ...exit, ...next } : exit)));
  }

  function move(index: number, offset: -1 | 1) {
    const to = index + offset;
    if (to < 0 || to >= step.forward.length) return;
    const next = [...step.forward];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Text type="secondary" className="block text-xs">
        {t.exitsHint}
      </Text>

      {step.forward.map((exit, index) => (
        <div
          key={`${exit.to}-${index}`}
          className="flex flex-col gap-2 rounded-lg border border-black/10 p-2 md:flex-row md:flex-wrap md:items-center"
        >
          <span className="flex items-center gap-2">
            <Text strong>{index + 1}.</Text>
            <Text>{t.exitTo}</Text>
            <Select
              className="min-w-40 flex-1"
              value={exit.to || undefined}
              options={targets}
              onChange={(to: string) => patch(index, { to })}
            />
          </span>

          {exit.condition ? (
            <ConditionFields
              condition={exit.condition}
              fields={fields}
              onChange={(condition) => patch(index, { condition })}
            />
          ) : (
            <Text type="secondary">{t.exitAlways}</Text>
          )}

          <span className="flex items-center gap-1 md:ml-auto">
            <Button
              size="small"
              type="link"
              onClick={() =>
                patch(index, {
                  condition: exit.condition
                    ? null
                    : { field: fields[0]?.value ?? "", op: "gt", value: "" },
                })
              }
            >
              {exit.condition ? t.removeCondition : t.addCondition}
            </Button>
            <Button
              size="small"
              type="text"
              aria-label={t.moveUp}
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            />
            <Button
              size="small"
              type="text"
              aria-label={t.moveDown}
              icon={<ArrowDownOutlined />}
              disabled={index === step.forward.length - 1}
              onClick={() => move(index, 1)}
            />
            <Button
              size="small"
              type="text"
              danger
              aria-label={messages.requestTypes.remove}
              icon={<DeleteOutlined />}
              onClick={() => onChange(step.forward.filter((_, i) => i !== index))}
            />
          </span>
        </div>
      ))}

      <Button
        type="dashed"
        block
        disabled={!targets.length}
        onClick={() =>
          onChange([...step.forward, { to: targets[0]?.value ?? "", condition: null }])
        }
      >
        {t.addExit}
      </Button>
    </div>
  );
}

function ConditionFields({
  condition,
  fields,
  onChange,
}: {
  readonly condition: FlowCondition;
  readonly fields: readonly { value: string; label: string }[];
  readonly onChange: (next: FlowCondition) => void;
}) {
  const valueText = Array.isArray(condition.value)
    ? condition.value.join(", ")
    : scalarText(condition.value);

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Text>{t.exitWhen}</Text>
      <SearchSelect
        className="min-w-36"
        placeholder={t.fieldPlaceholder}
        value={condition.field || undefined}
        options={[...fields]}
        onChange={(field: string) => onChange({ ...condition, field })}
      />
      <Select
        className="min-w-32"
        value={condition.op}
        options={FLOW_CONDITION_OPS.map((op) => ({ value: op, label: t.ops[op] }))}
        onChange={(op: FlowConditionOp) =>
          onChange({ ...condition, op, value: parseValue(op, valueText) })
        }
      />
      <Input
        className="w-36"
        placeholder={condition.op === "in" ? t.inHint : t.valuePlaceholder}
        value={valueText}
        onChange={(event) =>
          onChange({ ...condition, value: parseValue(condition.op, event.target.value) })
        }
      />
    </span>
  );
}

/** Numbers for comparisons, a list for `in`, text otherwise — what the engine compares. */
function parseValue(op: FlowConditionOp, text: string): unknown {
  if (op === "in") {
    return text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (op === "eq" || op === "neq") return text;
  const number = Number(text);
  return text.trim() !== "" && !Number.isNaN(number) ? number : text;
}

function scalarText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/** Backward exits: earlier steps the work may be sent back to. */
export function BackwardEditor({
  step,
  steps,
  onChange,
}: {
  readonly step: StepDraft;
  readonly steps: readonly StepDraft[];
  readonly onChange: (backward: string[]) => void;
}) {
  const options = steps
    .filter((candidate) => candidate.code !== step.code)
    .map((candidate) => ({ value: candidate.code, label: candidate.name }));

  return (
    <div className="space-y-1">
      <Text type="secondary" className="block text-xs">
        {t.backwardHint}
      </Text>
      <Checkbox.Group
        className="flex flex-wrap gap-2"
        value={step.backward}
        options={options}
        onChange={(values) => onChange(values.map(String))}
      />
    </div>
  );
}
