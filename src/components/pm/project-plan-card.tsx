"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  PlanPreview,
  PlanTaskView,
  ProjectPlanView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ProjectGantt } from "./project-gantt";

const m = messages.projects.plan;

interface Draft {
  id?: string;
  title: string;
  description: string;
  parentId: string | null;
  position: number | null;
  ownerUserId: string | null;
  durationDays: number;
  milestoneId: string | null;
  changeRequestId: string | null;
  after: string[];
  summary: boolean;
}

const date = (value: string | null) =>
  value ? dayjs(value).format("D MMM YY") : "—";

/**
 * CD-177 — the work breakdown: each task with its owner and working days,
 * what it waits for, and the dates, float and critical path worked out
 * from the project's start and the company calendar.
 */
export function ProjectPlanCard({
  projectId,
  view,
  people,
  changeOptions = [],
}: {
  readonly projectId: string;
  readonly view: ProjectPlanView;
  readonly people: { id: string; name: string }[];
  /** CD-185 — open change requests a task may come from. */
  readonly changeOptions?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"table" | "timeline">("table");
  const [impact, setImpact] = useState<PlanPreview | null>(null);

  // CD-178 — what saving this change would move, before it is saved
  const editingId = draft?.id;
  const editingDays = draft?.durationDays;
  const editingAfter = draft?.after.join(",");
  useEffect(() => {
    if (!editingId) return;
    const timer = setTimeout(() => {
      const current = view.tasks.find((task) => task.id === editingId);
      void appApi<PlanPreview>(`projects/${projectId}/plan/preview`, {
        method: "POST",
        body: JSON.stringify({
          task_id: editingId,
          duration_days: editingDays,
          predecessors: (editingAfter ? editingAfter.split(",") : []).map(
            (id) => ({
              task_id: id,
              lag_days:
                current?.predecessors.find((item) => item.taskId === id)
                  ?.lagDays ?? 0,
            }),
          ),
        }),
      }).then((result) => setImpact(result.ok ? result.data : null));
    }, 400);
    return () => clearTimeout(timer);
  }, [editingId, editingDays, editingAfter, projectId, view.tasks]);
  const { canEdit } = view;
  const base = `projects/${projectId}/plan`;
  const pickable = [
    ...people,
    ...view.tasks
      .filter(
        (task) =>
          task.ownerUserId &&
          !people.some((person) => person.id === task.ownerUserId),
      )
      .map((task) => ({ id: task.ownerUserId!, name: task.ownerName ?? "" })),
  ];

  async function call(path: string, init: RequestInit, done?: string) {
    setBusy(true);
    setError(null);
    const result = await appApi<{ taskId?: string }>(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    if (done) message.success(done);
    router.refresh();
    return result.data;
  }

  function open(task?: PlanTaskView, parentId?: string) {
    setError(null);
    setImpact(null);
    setDraft(
      task
        ? {
            id: task.id,
            title: task.title,
            description: task.description ?? "",
            parentId: task.parentId,
            position: task.seq,
            ownerUserId: task.ownerUserId,
            durationDays: task.durationDays,
            milestoneId: task.milestone?.id ?? null,
            changeRequestId: task.changeRequest?.id ?? null,
            after: task.predecessors.map((item) => item.taskId),
            summary: task.summary,
          }
        : {
            title: "",
            description: "",
            parentId: parentId ?? null,
            position: null,
            ownerUserId: null,
            durationDays: 1,
            milestoneId: null,
            changeRequestId: null,
            after: [],
            summary: false,
          },
    );
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError(m.form.required);
      return;
    }
    const current = draft.id
      ? view.tasks.find((task) => task.id === draft.id)
      : undefined;
    const body = JSON.stringify({
      title: draft.title,
      description: draft.description,
      parent_id: draft.parentId,
      ...(draft.id && draft.position ? { position: draft.position } : {}),
      owner_user_id: draft.ownerUserId,
      duration_days: draft.durationDays,
      milestone_id: draft.milestoneId,
      change_request_id: draft.changeRequestId,
    });
    const saved = await call(
      draft.id ? `${base}/tasks/${draft.id}` : `${base}/tasks`,
      {
        method: draft.id ? "PATCH" : "POST",
        body,
      },
    );
    if (!saved) return;
    const taskId = draft.id ?? saved.taskId;
    const before = (current?.predecessors ?? []).map((item) => item.taskId);
    const changed =
      before.length !== draft.after.length ||
      before.some((id) => !draft.after.includes(id));
    if (taskId && changed) {
      const linked = await call(`${base}/tasks/${taskId}/predecessors`, {
        method: "PUT",
        body: JSON.stringify({
          predecessors: draft.after.map((id) => ({
            task_id: id,
            // keep a lag already set
            lag_days:
              current?.predecessors.find((item) => item.taskId === id)
                ?.lagDays ?? 0,
          })),
        }),
      });
      if (!linked) return;
    }
    message.success(m.saved);
    setDraft(null);
  }

  const depth = (wbs: string) => wbs.split(".").length - 1;

  return (
    <Card
      size="small"
      title={`${m.title} · ${m.span(date(view.projectStart), view.finish ? date(view.finish) : null)}`}
      extra={
        canEdit ? (
          <Space wrap>
            <Button
              size="small"
              loading={busy}
              onClick={() =>
                void call(
                  `${base}/from-deliverables`,
                  { method: "POST" },
                  m.fromDeliverablesDone,
                )
              }
            >
              {m.fromDeliverables}
            </Button>
            <Button size="small" type="primary" onClick={() => open()}>
              {m.add}
            </Button>
          </Space>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {view.problems.map((problem) => (
        <Alert
          key={problem}
          className="mb-2"
          type="error"
          showIcon
          title={problem}
        />
      ))}
      {error && !draft && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.milestones.length > 0 && (
        <div className="mb-2 rounded border p-2 text-xs">
          <Text strong>{m.forecastTitle}</Text>
          {view.milestones.map((row) => (
            <div key={row.id} className="flex flex-wrap gap-x-3">
              <span>{row.title}</span>
              <Text type={row.late ? "danger" : "secondary"}>
                {row.forecast
                  ? m.forecast(dayjs(row.forecast).format("D MMM YY"))
                  : m.noForecast}
              </Text>
              {row.dueOn && (
                <Text type="secondary">
                  {m.due(dayjs(row.dueOn).format("D MMM YY"))}
                </Text>
              )}
              {row.installment?.dueOn && (
                <Text type="secondary">
                  {m.payDue(
                    row.installment.seq,
                    dayjs(row.installment.dueOn).format("D MMM YY"),
                  )}
                </Text>
              )}
              {row.late && <Tag color="red">{m.late}</Tag>}
            </div>
          ))}
        </div>
      )}

      <Segmented
        className="mb-2"
        size="small"
        value={mode}
        onChange={(value) => setMode(value as "table" | "timeline")}
        options={[
          { value: "table", label: m.views.table },
          { value: "timeline", label: m.views.timeline },
        ]}
      />
      {mode === "timeline" ? (
        <ProjectGantt
          tasks={view.tasks}
          projectStart={view.projectStart}
          finish={view.finish}
          milestones={view.milestones}
        />
      ) : (
        <Table<PlanTaskView>
          size="small"
          rowKey="id"
          pagination={false}
          scroll={{ x: 980 }}
          dataSource={view.tasks}
          locale={{ emptyText: m.empty }}
          columns={[
            { title: m.columns.wbs, dataIndex: "wbs", width: 70 },
            {
              title: m.columns.task,
              key: "task",
              render: (_: unknown, task) => (
                <div style={{ paddingLeft: depth(task.wbs) * 16 }}>
                  <Link
                    href={ROUTES.projectTask(projectId, task.id)}
                    className={task.summary ? "font-medium" : ""}
                  >
                    {task.title}
                  </Link>{" "}
                  {task.changeRequest && (
                    <Tag
                      color={
                        task.changeRequest.status === "approved"
                          ? "purple"
                          : "orange"
                      }
                    >
                      {messages.projects.changes.taskFrom(
                        `CR-${task.changeRequest.seq}`,
                      )}
                      {task.changeRequest.status !== "approved" &&
                        ` · ${messages.projects.changes.taskWaits}`}
                    </Tag>
                  )}
                  {!task.summary && task.status !== "open" && (
                    <Tag
                      color={messages.projects.work.statusColor[task.status]}
                    >
                      {messages.projects.work.status[task.status]}
                    </Tag>
                  )}
                  {task.critical && !task.summary && (
                    <Tag color="red">{m.critical}</Tag>
                  )}
                  {task.durationDays === 0 && !task.summary && (
                    <Tag>{m.point}</Tag>
                  )}
                  {task.milestone && (
                    <Tag color="blue">{task.milestone.title}</Tag>
                  )}
                </div>
              ),
            },
            {
              title: m.columns.owner,
              key: "owner",
              width: 140,
              render: (_: unknown, task) => task.ownerName ?? "—",
            },
            {
              title: m.columns.duration,
              key: "duration",
              width: 80,
              align: "right",
              render: (_: unknown, task) =>
                task.summary ? "—" : task.durationDays,
            },
            {
              title: m.columns.start,
              key: "start",
              width: 100,
              render: (_: unknown, task) => date(task.start),
            },
            {
              title: m.columns.finish,
              key: "finish",
              width: 100,
              render: (_: unknown, task) => date(task.finish),
            },
            {
              title: m.columns.float,
              key: "float",
              width: 80,
              align: "right",
              render: (_: unknown, task) =>
                task.floatDays === null ? (
                  "—"
                ) : (
                  <Text type={task.floatDays === 0 ? "danger" : undefined}>
                    {task.floatDays}
                  </Text>
                ),
            },
            {
              title: m.columns.after,
              key: "after",
              width: 100,
              render: (_: unknown, task) =>
                task.predecessors
                  .map((item) =>
                    item.lagDays ? `${item.wbs}+${item.lagDays}` : item.wbs,
                  )
                  .join(", ") || "—",
            },
            ...(canEdit
              ? [
                  {
                    title: "",
                    key: "actions",
                    width: 210,
                    render: (_: unknown, task: PlanTaskView) => (
                      <Space size={0} wrap>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => open(task)}
                        >
                          {m.edit}
                        </Button>
                        {!task.predecessors.length && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => open(undefined, task.id)}
                          >
                            {m.addChild}
                          </Button>
                        )}
                        <Popconfirm
                          title={m.cancelConfirm}
                          onConfirm={() =>
                            void call(`${base}/tasks/${task.id}/cancel`, {
                              method: "POST",
                            })
                          }
                        >
                          <Button size="small" type="link" danger>
                            {m.cancel}
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? m.form.editTitle : m.form.addTitle}
        width={640}
        onCancel={() => setDraft(null)}
        okText={m.save}
        cancelText={m.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {draft && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            {draft.id && impact && (
              <Alert
                type={
                  impact.problems.length
                    ? "error"
                    : impact.milestones.some(
                          (row) =>
                            row.installment &&
                            row.from &&
                            row.forecast &&
                            row.forecast > row.from,
                        )
                      ? "warning"
                      : "info"
                }
                showIcon
                title={m.impact.title}
                description={
                  <div className="text-xs">
                    {impact.problems.map((problem) => (
                      <div key={problem}>{problem}</div>
                    ))}
                    {impact.finish.from &&
                      impact.finish.to &&
                      impact.finish.from !== impact.finish.to && (
                        <div>
                          {m.impact.finish(
                            dayjs(impact.finish.from).format("D MMM YY"),
                            dayjs(impact.finish.to).format("D MMM YY"),
                          )}
                        </div>
                      )}
                    <div>
                      {impact.moved.length
                        ? m.impact.moved(impact.moved.length)
                        : m.impact.none}
                    </div>
                    {impact.milestones.map((row) => (
                      <div key={row.id}>
                        {m.impact.milestone(
                          row.title,
                          row.from ? dayjs(row.from).format("D MMM YY") : "—",
                          row.forecast
                            ? dayjs(row.forecast).format("D MMM YY")
                            : "—",
                        )}
                      </div>
                    ))}
                    {impact.milestones.some(
                      (row) =>
                        row.installment &&
                        row.from &&
                        row.forecast &&
                        row.forecast > row.from,
                    ) && <div className="font-medium">{m.impact.notify}</div>}
                  </div>
                }
              />
            )}
            <label className="block text-xs">
              {m.form.name}
              <Input
                value={draft.title}
                maxLength={255}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs sm:col-span-2">
                {m.form.parent}
                <Select
                  className="w-full"
                  allowClear
                  placeholder={m.form.parentNone}
                  value={draft.parentId ?? undefined}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, parentId: value ?? null })
                  }
                  options={view.tasks
                    .filter(
                      (task) =>
                        task.id !== draft.id && !task.predecessors.length,
                    )
                    .map((task) => ({
                      value: task.id,
                      label: `${task.wbs} ${task.title}`,
                    }))}
                />
              </label>
              {draft.id && (
                <label className="block text-xs">
                  {m.form.position}
                  <InputNumber
                    className="w-full!"
                    min={1}
                    value={draft.position}
                    onChange={(value) =>
                      setDraft({ ...draft, position: value ?? null })
                    }
                  />
                </label>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.owner}
                <SearchSelect
                  className="w-full"
                  allowClear
                  value={draft.ownerUserId ?? undefined}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, ownerUserId: value ?? null })
                  }
                  options={pickable.map((person) => ({
                    value: person.id,
                    label: person.name,
                  }))}
                />
              </label>
              <label className="block text-xs">
                {draft.summary ? m.form.durationSummary : m.form.duration}
                <InputNumber
                  className="w-full!"
                  min={0}
                  max={3650}
                  disabled={draft.summary}
                  value={draft.durationDays}
                  onChange={(value) =>
                    setDraft({ ...draft, durationDays: Number(value ?? 0) })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.milestone}
              <Select
                className="w-full"
                allowClear
                placeholder={m.form.milestoneNone}
                value={draft.milestoneId ?? undefined}
                onChange={(value?: string) =>
                  setDraft({ ...draft, milestoneId: value ?? null })
                }
                options={view.milestones.map((row) => ({
                  value: row.id,
                  label: row.title,
                }))}
              />
            </label>
            {changeOptions.length > 0 && (
              <label className="block text-xs">
                {messages.projects.changes.title}
                <Select
                  className="w-full"
                  allowClear
                  value={draft.changeRequestId ?? undefined}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, changeRequestId: value ?? null })
                  }
                  options={changeOptions.map((row) => ({
                    value: row.id,
                    label: row.label,
                  }))}
                />
              </label>
            )}
            {!draft.summary && (
              <label className="block text-xs">
                {m.form.after}
                <SearchSelect
                  mode="multiple"
                  className="w-full"
                  value={draft.after}
                  onChange={(value: string[]) =>
                    setDraft({ ...draft, after: value })
                  }
                  options={view.tasks
                    .filter((task) => task.id !== draft.id && !task.summary)
                    .map((task) => ({
                      value: task.id,
                      label: `${task.wbs} ${task.title}`,
                    }))}
                />
              </label>
            )}
            <label className="block text-xs">
              {m.form.description}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
