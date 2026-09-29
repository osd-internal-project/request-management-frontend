"use client";

import { useMemo } from "react";
import { Button, Form } from "antd";
import type { MatrixLevel, OrgUnitNode } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { buildUnitTree } from "@/lib/org/org-tree";
import {
  LevelFields,
  levelPayload,
  type LevelFormValues,
} from "@/components/admin/approval-levels-fields";

/** A v2 approval step's own ladder, edited in place and written back on every change. */
export function StepApprovalLevels({
  levels,
  orgUnits,
  conditionFields,
  onChange,
}: {
  readonly levels: readonly MatrixLevel[];
  readonly orgUnits: readonly OrgUnitNode[];
  readonly conditionFields: readonly { value: string; label: string }[];
  readonly onChange: (levels: MatrixLevel[]) => void;
}) {
  const [form] = Form.useForm();
  const unitTree = useMemo(() => buildUnitTree([...orgUnits]), [orgUnits]);

  function emit() {
    // antd returns form values untyped; the list holds what `LevelFields` renders.
    const values = form.getFieldsValue(true) as { levels?: LevelFormValues[] };
    onChange((values.levels ?? []).filter(Boolean).map(levelPayload));
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ levels }}
      onValuesChange={emit}
    >
      <Form.List name="levels">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <LevelFields
                key={field.key}
                name={field.name}
                form={form}
                unitTree={unitTree}
                conditionFields={conditionFields}
                withChartOf
                onRemove={() => {
                  remove(field.name);
                  emit();
                }}
              />
            ))}
            <Button
              onClick={() => {
                add({ type: "supervisor", up: 1, chartOf: "requester" });
                emit();
              }}
            >
              {messages.matrix.addLevel}
            </Button>
          </>
        )}
      </Form.List>
    </Form>
  );
}
