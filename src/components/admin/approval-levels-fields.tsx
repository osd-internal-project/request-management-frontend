"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Radio,
  Segmented,
  Select,
} from "antd";
import type { FormInstance } from "antd";
import { adminApi } from "@/lib/api/client";
import {
  FLOW_CONDITION_OPS,
  type FlowCondition,
  type MatrixLevel,
  type MatrixLevelOptions,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect, SearchTreeSelect } from "@/components/ui/search-select";
import type { UnitTreeNode } from "@/lib/org/org-tree";

/** One level as the antd form holds it, before `levelPayload` trims it. */
export interface LevelFormValues extends MatrixLevelOptions {
  type: "supervisor" | "org";
  up?: number;
  orgUnitIds?: string[];
  userIds?: string[];
}

/** Only the fields the chosen shape uses, plus options that differ from the default. */
export function levelPayload(level: LevelFormValues): MatrixLevel {
  const shape =
    level.type === "supervisor"
      ? { type: "supervisor" as const, up: level.up ?? 1 }
      : {
          type: "org" as const,
          orgUnitIds: level.orgUnitIds ?? [],
          userIds: level.userIds ?? [],
        };
  // `chartOf` means something only on a supervisor level.
  const { chartOf, ...options } = levelOptionsOf(level);
  return {
    ...shape,
    ...options,
    ...(chartOf && level.type === "supervisor" ? { chartOf } : {}),
  };
}

/**
 * One level of the ladder being authored; a `Segmented` picks its shape first.
 * Field paths are `levels[name]`, so the host form must use `Form.List name="levels"`.
 */
export function LevelFields({
  name,
  form,
  unitTree,
  conditionFields,
  withChartOf = false,
  onRemove,
}: {
  name: number;
  form: FormInstance;
  unitTree: UnitTreeNode[];
  /** Fields a condition may name; empty hides the condition controls. */
  conditionFields: readonly { value: string; label: string }[];
  /** Flow v2 approval steps: ask whose chart a supervisor level climbs. */
  withChartOf?: boolean;
  onRemove: () => void;
}) {
  const condition = Form.useWatch(["levels", name, "condition"], form) as
    FlowCondition | undefined;
  const type = Form.useWatch(["levels", name, "type"], form) as
    "supervisor" | "org" | undefined;

  const chosenUnits = (Form.useWatch(["levels", name, "orgUnitIds"], form) ??
    []) as string[];

  const [people, setPeople] = useState<
    { value: string; label: string }[]
  >([]);

  /**
   * The people under the chosen groups, so "pick from this group" means the
   * whole subtree — a department's people sit in the positions under it, not
   * in the department itself.
   */
  async function loadPeople(unitIds: string[]) {
    const results = await Promise.all(
      unitIds.map((unitId) =>
        adminApi<{ id: string; displayName: string; username: string }[]>(
          `org-units/${unitId}/members/recursive`,
        ),
      ),
    );

    const found = new Map<string, { value: string; label: string }>();
    for (const result of results) {
      if (!result.ok) continue;
      for (const person of result.data) {
        found.set(person.id, {
          value: person.id,
          label: `${person.displayName} · ${person.username}`,
        });
      }
    }

    setPeople([...found.values()]);

    // People picked under groups that are no longer chosen would still approve; drop them.
    const picked = (form.getFieldValue(["levels", name, "userIds"]) ?? []) as string[];
    form.setFieldValue(
      ["levels", name, "userIds"],
      picked.filter((userId) => found.has(userId)),
    );
  }

  return (
    <Card size="small" className="mb-3!">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Form.Item name={[name, "type"]} noStyle>
          <Segmented
            options={[
              {
                value: "supervisor",
                label: messages.matrix.levelSupervisor,
              },
              { value: "org", label: messages.matrix.levelOrg },
            ]}
          />
        </Form.Item>
        <Button type="link" danger onClick={onRemove}>
          {messages.requestForm.remove}
        </Button>
      </div>

      {type === "org" ? (
        <>
          <Form.Item
            name={[name, "orgUnitIds"]}
            label={messages.matrix.levelGroups}
            rules={[{ required: true }]}
          >
            <SearchTreeSelect
              multiple
              allowClear
              treeDefaultExpandAll
              treeData={unitTree}
              onChange={(next: string[]) => void loadPeople(next)}
            />
          </Form.Item>

          <Form.Item
            name={[name, "userIds"]}
            label={messages.matrix.levelPeople}
            extra={messages.matrix.levelPeopleHint}
          >
            <SearchSelect
              mode="multiple"
              allowClear
              disabled={!chosenUnits.length}
              options={people}
            />
          </Form.Item>
        </>
      ) : (
        <div className="grid gap-x-4 md:grid-cols-2">
          {withChartOf && (
            <Form.Item
              name={[name, "chartOf"]}
              label={messages.matrix.levelChartOf}
              initialValue="requester"
            >
              <Radio.Group
                options={[
                  {
                    value: "requester",
                    label: messages.matrix.chartOfRequester,
                  },
                  { value: "worker", label: messages.matrix.chartOfWorker },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            name={[name, "up"]}
            label={messages.matrix.levelUp}
            extra={messages.matrix.levelUpHint}
            rules={[{ required: true }]}
          >
            <SearchSelect
              options={[1, 2, 3, 4].map((up) => ({
                value: up,
                label: messages.matrix.supervisorLevel[up],
              }))}
            />
          </Form.Item>
        </div>
      )}

      <div className="grid gap-x-4 md:grid-cols-3">
        <Form.Item name={[name, "mode"]} label={messages.matrix.levelMode} initialValue="any">
          <Radio.Group
            options={[
              { value: "any", label: messages.matrix.modeAny },
              { value: "all", label: messages.matrix.modeAll },
            ]}
          />
        </Form.Item>
        <Form.Item
          name={[name, "noteRequired"]}
          label={messages.matrix.levelNote}
          initialValue="always"
        >
          <Select
            options={[
              { value: "always", label: messages.matrix.noteAlways },
              { value: "reject_or_return", label: messages.matrix.noteRejectOnly },
            ]}
          />
        </Form.Item>
        <Form.Item
          name={[name, "slaHours"]}
          label={messages.matrix.levelSla}
          extra={messages.matrix.levelSlaHint}
        >
          <InputNumber min={1} className="w-full" />
        </Form.Item>
      </div>

      {conditionFields.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{messages.matrix.levelCondition}</span>
            {condition ? (
              <>
                <Form.Item name={[name, "condition", "field"]} noStyle rules={[{ required: true }]}>
                  <Select className="min-w-36" options={[...conditionFields]} />
                </Form.Item>
                <Form.Item name={[name, "condition", "op"]} noStyle>
                  <Select
                    className="min-w-32"
                    options={FLOW_CONDITION_OPS.map((op) => ({
                      value: op,
                      label: messages.requestTypes.flow.ops[op],
                    }))}
                  />
                </Form.Item>
                <Form.Item name={[name, "condition", "value"]} noStyle rules={[{ required: true }]}>
                  <Input className="w-36" />
                </Form.Item>
              </>
            ) : (
              <span className="text-black/45">{messages.matrix.conditionAlways}</span>
            )}
            <Button
              type="link"
              size="small"
              onClick={() =>
                form.setFieldValue(
                  ["levels", name, "condition"],
                  condition
                    ? undefined
                    : { field: conditionFields[0]?.value, op: "gt", value: "" },
                )
              }
            >
              {condition ? messages.matrix.removeCondition : messages.matrix.addCondition}
            </Button>
          </div>
          {condition && (
            <span className="block text-xs text-black/45">{messages.matrix.conditionHint}</span>
          )}
        </div>
      )}
    </Card>
  );
}

export const DEFAULT_LEVELS: MatrixLevel[] = [{ type: "supervisor", up: 1 }];

/** Only options that differ from the default, so an unchanged ladder publishes as before. */
function levelOptionsOf(level: MatrixLevelOptions): MatrixLevelOptions {
  const condition = level.condition?.field
    ? {
        ...level.condition,
        value:
          level.condition.op === "in"
            ? textOf(level.condition.value)
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
            : numberOrText(level.condition.value),
      }
    : undefined;

  return {
    ...(level.chartOf ? { chartOf: level.chartOf } : {}),
    ...(level.mode === "all" ? { mode: "all" as const } : {}),
    ...(level.noteRequired === "reject_or_return"
      ? { noteRequired: "reject_or_return" as const }
      : {}),
    ...(typeof level.slaHours === "number" ? { slaHours: level.slaHours } : {}),
    ...(condition ? { condition } : {}),
  };
}

function textOf(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numberOrText(value: unknown): unknown {
  const text = textOf(value).trim();
  return text !== "" && !Number.isNaN(Number(text)) ? Number(text) : text;
}
