"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type { ProjectIssueView, ProjectIssuesView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.issues;

interface Draft {
  id?: string;
  title: string;
  description: string;
  severity: ProjectIssueView["severity"];
  days: number;
  cost: number;
  ownerUserId: string | null;
  dueOn: Dayjs | null;
  taskId: string | null;
}

/**
 * CD-184 — problems met on the way: what each does to the schedule and
 * cost, who fixes it by when; one that changes what was sold becomes a
 * change request.
 */
export function ProjectIssuesCard({
  projectId,
  view,
  people,
  tasks,
  currentUserId,
}: {
  readonly projectId: string;
  readonly view: ProjectIssuesView;
  readonly people: { id: string; name: string }[];
  /** The plan's tasks, for "the task it holds up". */
  readonly tasks: { id: string; label: string }[];
  readonly currentUserId: string | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resolving, setResolving] = useState<ProjectIssueView | null>(null);
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/issues`;
  const pickable = [
    ...people,
    ...view.issues
      .filter((row) => !people.some((person) => person.id === row.ownerUserId))
      .map((row) => ({ id: row.ownerUserId, name: row.ownerName ?? "" })),
  ].filter(
    (person, index, all) => all.findIndex((p) => p.id === person.id) === index,
  );

  async function call<T>(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const result = await appApi<T>(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    router.refresh();
    return result.data;
  }

  async function save() {
    if (!draft) return;
    const done = await call(draft.id ? `${base}/${draft.id}` : base, {
      method: draft.id ? "PATCH" : "POST",
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        severity: draft.severity,
        schedule_impact_days: draft.days,
        cost_impact: draft.cost,
        owner_user_id: draft.ownerUserId ?? undefined,
        due_on: draft.dueOn?.format("YYYY-MM-DD"),
        task_id: draft.taskId,
      }),
    });
    if (done) {
      message.success(m.saved);
      setDraft(null);
    }
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.summary.open}`}
      extra={
        view.canEdit ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setDraft({
                title: "",
                description: "",
                severity: "medium",
                days: 0,
                cost: 0,
                ownerUserId: null,
                dueOn: null,
                taskId: null,
              });
            }}
          >
            {m.add}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-1 block text-xs">
        {m.hint}
      </Text>
      {view.summary.open > 0 && (
        <Text
          type={view.summary.overdue ? "danger" : "secondary"}
          className="mb-2 block text-xs"
        >
          {m.summary(
            view.summary.open,
            view.summary.overdue,
            view.summary.scheduleDays,
            formatAmount(view.summary.cost),
          )}
        </Text>
      )}
      {error && !draft && !resolving && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.issues.length ? (
        <div className="divide-y">
          {view.issues.map((issue) => (
            <div
              key={issue.id}
              className={`py-2 text-sm ${issue.status === "resolved" ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {issue.label} · {issue.title}
                  </span>{" "}
                  <Tag color={m.severityColor[issue.severity]}>
                    {m.severity[issue.severity]}
                  </Tag>
                  {issue.status === "resolved" && (
                    <Tag color="success">{m.resolved}</Tag>
                  )}
                  {issue.overdue && <Tag color="red">{m.overdue}</Tag>}
                  {issue.changeRequest && (
                    <Tag color="purple">
                      {m.becameChange(issue.changeRequest.label)}
                    </Tag>
                  )}
                </div>
                {issue.status === "open" && (
                  <Space size={0} wrap>
                    {view.canEdit && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setError(null);
                          setDraft({
                            id: issue.id,
                            title: issue.title,
                            description: issue.description ?? "",
                            severity: issue.severity,
                            days: issue.scheduleImpactDays,
                            cost: issue.costImpact,
                            ownerUserId: issue.ownerUserId,
                            dueOn: issue.dueOn ? dayjs(issue.dueOn) : null,
                            taskId: issue.task?.id ?? null,
                          });
                        }}
                      >
                        {m.edit}
                      </Button>
                    )}
                    {view.canEdit && !issue.changeRequest && (
                      <Popconfirm
                        title={m.toChangeConfirm}
                        onConfirm={async () => {
                          const done = await call<{
                            changeId: string;
                            issues: ProjectIssueView[];
                          }>(`${base}/${issue.id}/change`, { method: "POST" });
                          const label = done?.issues.find(
                            (row) => row.id === issue.id,
                          )?.changeRequest?.label;
                          if (label) message.success(m.toChangeDone(label));
                        }}
                      >
                        <Button size="small" type="link">
                          {m.toChange}
                        </Button>
                      </Popconfirm>
                    )}
                    {(view.canEdit || issue.ownerUserId === currentUserId) && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setError(null);
                          setResolution("");
                          setResolving(issue);
                        }}
                      >
                        {m.resolve}
                      </Button>
                    )}
                  </Space>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {m.owner}: {issue.ownerName ?? "—"}
                {issue.dueOn &&
                  ` · ${m.due(dayjs(issue.dueOn).format("D MMM YY"))}`}
                {" · "}
                {m.impact(
                  issue.scheduleImpactDays,
                  formatAmount(issue.costImpact),
                )}
                {issue.task && ` · ${m.task}: ${issue.task.title}`}
              </Text>
              {issue.description && (
                <div className="text-xs whitespace-pre-line">
                  {issue.description}
                </div>
              )}
              {issue.resolution && (
                <Text type="success" className="block text-xs">
                  {m.resolution(issue.resolution)}
                </Text>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? m.form.editTitle : m.form.addTitle}
        onCancel={() => setDraft(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {draft && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
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
            <label className="block text-xs">
              {m.form.description}
              <Input.TextArea
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                {m.form.severity}
                <Select
                  className="w-full"
                  value={draft.severity}
                  onChange={(severity: Draft["severity"]) =>
                    setDraft({ ...draft, severity })
                  }
                  options={Object.entries(m.severity).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
              <label className="block text-xs">
                {m.form.days}
                <InputNumber
                  className="w-full!"
                  min={0}
                  value={draft.days}
                  onChange={(value) =>
                    setDraft({ ...draft, days: Number(value ?? 0) })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.cost}
                <InputNumber
                  className="w-full!"
                  min={0}
                  value={draft.cost}
                  onChange={(value) =>
                    setDraft({ ...draft, cost: Number(value ?? 0) })
                  }
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.owner}
                <SearchSelect
                  className="w-full"
                  value={draft.ownerUserId ?? undefined}
                  onChange={(value: string) =>
                    setDraft({ ...draft, ownerUserId: value })
                  }
                  options={pickable.map((person) => ({
                    value: person.id,
                    label: person.name,
                  }))}
                />
              </label>
              <label className="block text-xs">
                {m.form.due}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.dueOn}
                  onChange={(value) => setDraft({ ...draft, dueOn: value })}
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.task}
              <Select
                className="w-full"
                allowClear
                value={draft.taskId ?? undefined}
                onChange={(value?: string) =>
                  setDraft({ ...draft, taskId: value ?? null })
                }
                options={tasks.map((task) => ({
                  value: task.id,
                  label: task.label,
                }))}
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={resolving !== null}
        title={`${m.form.resolveTitle}: ${resolving?.label ?? ""}`}
        onCancel={() => setResolving(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={async () => {
          if (!resolving) return;
          const done = await call(`${base}/${resolving.id}/resolve`, {
            method: "POST",
            body: JSON.stringify({ resolution }),
          });
          if (done) {
            message.success(m.saved);
            setResolving(null);
          }
        }}
        destroyOnHidden
      >
        {error && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        <label className="block text-xs">
          {m.form.resolution}
          <Input.TextArea
            rows={3}
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
          />
        </label>
      </Modal>
    </Card>
  );
}
