"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ProjectTechPlanView, TechPlanTaskView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.techPlan;
const show = (value: string) => dayjs(value).format("D MMM YY");

interface Line {
  boqIndex: number | null;
  name: string;
  quantity: number | null;
  unit: string;
}

interface Draft {
  task: TechPlanTaskView;
  crew: string[];
  needsEquipment: boolean;
  lines: Line[];
}

/**
 * CD-209 — the technical plan: who works each task and with what, the
 * equipment needed week by week, and handoff 7 holding the work until the
 * plan is complete.
 */
export function ProjectTechPlanCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectTechPlanView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickable = [
    ...people,
    ...view.tasks
      .flatMap((task) => task.crew)
      .filter((member) => !people.some((person) => person.id === member.id)),
  ].filter(
    (person, index, all) => all.findIndex((p) => p.id === person.id) === index,
  );

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const response = await appApi(
      `projects/${projectId}/tech-plan/${draft.task.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          crew_user_ids: draft.crew,
          needs_equipment: draft.needsEquipment,
          equipment: draft.lines.map((line) => ({
            boq_index: line.boqIndex ?? undefined,
            name: line.name,
            quantity: line.quantity,
            unit: line.unit,
          })),
        }),
      },
    );
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    message.success(m.saved);
    setDraft(null);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          <Tag color={view.handoff.ready ? "success" : "warning"}>
            {view.handoff.ready ? m.ready : m.notReady}
          </Tag>
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {view.handoff.blockers.length > 0 && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={view.handoff.blockers.join(" · ")}
        />
      )}

      {view.tasks.length ? (
        <div className="divide-y">
          {view.tasks.map((task) => (
            <div key={task.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{task.label}</span>{" "}
                  {task.needsEquipment && (
                    <Tag color={task.equipment.length ? "blue" : "red"}>
                      {task.equipment.length
                        ? m.needsEquipment
                        : m.missingEquipment}
                    </Tag>
                  )}
                </div>
                {view.canEdit && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setError(null);
                      setDraft({
                        task,
                        crew: task.crew.map((member) => member.id),
                        needsEquipment: task.needsEquipment,
                        lines: task.equipment.map((line) => ({
                          boqIndex: line.boqIndex,
                          name: line.boqIndex === null ? line.name : "",
                          quantity: line.quantity,
                          unit: line.unit ?? "",
                        })),
                      });
                    }}
                  >
                    {m.edit}
                  </Button>
                )}
              </div>
              <Text
                type={task.ownerUserId ? "secondary" : "danger"}
                className="block text-xs"
              >
                {task.ownerName ? m.owner(task.ownerName) : m.noOwner}
                {task.crew.length > 0 &&
                  ` · ${m.crew(task.crew.map((member) => member.name).join(", "))}`}
                {task.start &&
                  task.finish &&
                  ` · ${m.period(show(task.start), show(task.finish))}`}
              </Text>
              {task.equipment.length > 0 && (
                <div className="text-xs">
                  {task.equipment
                    .map((line) => m.line(line.name, line.quantity, line.unit))
                    .join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      {view.weekly.length > 0 && (
        <Collapse
          size="small"
          className="mt-2"
          items={[
            {
              key: "weekly",
              label: m.weekly,
              children: view.weekly.map((week) => (
                <div key={week.week} className="text-xs">
                  <span className="font-medium">{m.week(show(week.week))}</span>
                  {": "}
                  {week.items
                    .map((item) => m.line(item.name, item.quantity, item.unit))
                    .join(" · ")}
                </div>
              )),
            },
          ]}
        />
      )}

      <Modal
        open={draft !== null}
        title={m.form.title(draft?.task.label ?? "")}
        onCancel={() => setDraft(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
        width={640}
      >
        {draft && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.crew}
              <Select
                className="w-full"
                mode="multiple"
                optionFilterProp="label"
                value={draft.crew}
                onChange={(crew: string[]) => setDraft({ ...draft, crew })}
                options={pickable.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
              />
            </label>
            <Checkbox
              checked={draft.needsEquipment}
              onChange={(event) =>
                setDraft({ ...draft, needsEquipment: event.target.checked })
              }
            >
              {m.form.needsEquipment}
            </Checkbox>
            {draft.lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-1 sm:grid-cols-[1.4fr_1fr_80px_70px_32px]"
              >
                <Select
                  allowClear
                  placeholder={m.form.boq}
                  value={line.boqIndex ?? undefined}
                  onChange={(value?: number) => {
                    const lines = [...draft.lines];
                    lines[index] = { ...line, boqIndex: value ?? null };
                    setDraft({ ...draft, lines });
                  }}
                  options={view.boq.map((row) => ({
                    value: row.index,
                    label: row.label,
                  }))}
                />
                <Input
                  placeholder={m.form.name}
                  value={line.name}
                  onChange={(event) => {
                    const lines = [...draft.lines];
                    lines[index] = { ...line, name: event.target.value };
                    setDraft({ ...draft, lines });
                  }}
                />
                <InputNumber
                  placeholder={m.form.quantity}
                  min={0}
                  value={line.quantity}
                  onChange={(value) => {
                    const lines = [...draft.lines];
                    lines[index] = {
                      ...line,
                      quantity: value === null ? null : Number(value),
                    };
                    setDraft({ ...draft, lines });
                  }}
                />
                <Input
                  placeholder={m.form.unit}
                  value={line.unit}
                  onChange={(event) => {
                    const lines = [...draft.lines];
                    lines[index] = { ...line, unit: event.target.value };
                    setDraft({ ...draft, lines });
                  }}
                />
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      lines: draft.lines.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
            ))}
            <Button
              size="small"
              type="link"
              onClick={() =>
                setDraft({
                  ...draft,
                  lines: [
                    ...draft.lines,
                    { boqIndex: null, name: "", quantity: 1, unit: "" },
                  ],
                })
              }
            >
              {m.form.add}
            </Button>
          </div>
        )}
      </Modal>
    </Card>
  );
}
