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
  Modal,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  DefectSeverity,
  DefectView,
  ProjectDefectsView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.defects;

type Action = keyof typeof m.actions;

const severityColor: Record<DefectSeverity, string> = {
  blocker: "error",
  major: "warning",
  minor: "default",
};

const statusColor: Record<string, string> = {
  open: "error",
  fixed: "processing",
  verified: "success",
  cancelled: "default",
};

interface Draft {
  title: string;
  sowRef: string | null;
  severity: DefectSeverity;
  foundOn: Dayjs;
  assignee: string | null;
  description: string;
}

/** The moves a defect may make from where it stands. */
function actionsOf(defect: DefectView, canEdit: boolean): Action[] {
  const moves: Action[] =
    defect.status === "open"
      ? ["fix"]
      : defect.status === "fixed"
        ? ["verify", "reopen"]
        : [];
  if (canEdit && (defect.status === "open" || defect.status === "fixed")) {
    moves.push("cancel");
  }
  return moves;
}

/**
 * CD-213 — software work line by line of the SOW: its tests and the defects
 * still open; a defect closes only by a retest.
 */
export function ProjectDefectsCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectDefectsView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [moving, setMoving] = useState<{
    defect: DefectView;
    action: Action;
    note: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/defects`;

  async function post(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  async function save() {
    if (!draft) return;
    const ok = await post(base, {
      title: draft.title,
      sow_ref: draft.sowRef ?? "",
      severity: draft.severity,
      found_on: draft.foundOn.format("YYYY-MM-DD"),
      assignee_user_id: draft.assignee,
      description: draft.description,
    });
    if (ok) setDraft(null);
  }

  async function move() {
    if (!moving) return;
    const ok = await post(`${base}/${moving.defect.id}/move`, {
      action: moving.action,
      note: moving.note,
    });
    if (ok) setMoving(null);
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${m.summary(view.pending, view.open)}`}
      extra={
        view.canWrite && view.choices.length > 0 ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setDraft({
                title: "",
                sowRef: null,
                severity: "major",
                foundOn: dayjs(),
                assignee: null,
                description: "",
              });
            }}
          >
            {m.add}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && !draft && !moving && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      <Text strong className="text-xs">
        {m.lines}
      </Text>
      {view.lines.length ? (
        <div className="mb-3">
          {view.lines.map((line) => (
            <div
              key={line.ref}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <Tag color={line.pending ? "warning" : "success"}>
                {line.pending ? m.pending : m.proved}
              </Tag>
              <span>{line.text}</span>
              <Text type="secondary" className="text-xs">
                {[
                  line.task ? null : m.noTask,
                  m.tests(line.passed, line.tests),
                  line.openDefects ? m.openDefects(line.openDefects) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </div>
          ))}
        </div>
      ) : (
        <Text type="secondary" className="mb-3 block text-xs">
          {m.noLines}
        </Text>
      )}

      {view.defects.length ? (
        <div className="divide-y">
          {view.defects.map((defect) => (
            <div key={defect.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {defect.label} · {defect.title}
                  </span>{" "}
                  <Tag color={severityColor[defect.severity]}>
                    {m.severity[defect.severity]}
                  </Tag>
                  <Tag color={statusColor[defect.status]}>
                    {m.status[defect.status]}
                  </Tag>
                </div>
                {view.canWrite && (
                  <Space size={0} wrap>
                    {actionsOf(defect, view.canEdit).map((action) => (
                      <Button
                        key={action}
                        size="small"
                        type="link"
                        danger={action === "reopen" || action === "cancel"}
                        onClick={() => {
                          setError(null);
                          setMoving({ defect, action, note: "" });
                        }}
                      >
                        {m.actions[action]}
                      </Button>
                    ))}
                  </Space>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {[
                  defect.sowText,
                  defect.foundOn && dayjs(defect.foundOn).format("D MMM YY"),
                  defect.assigneeName && m.assignee(defect.assigneeName),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {defect.description && (
                <div className="text-xs whitespace-pre-line">
                  {defect.description}
                </div>
              )}
              {defect.reopenNote && defect.status !== "verified" && (
                <Text type="danger" className="block text-xs">
                  {m.reopened(defect.reopenNote)}
                </Text>
              )}
              {defect.fixNote && (
                <div className="text-xs">
                  {m.fixed(defect.fixNote, defect.fixedByName ?? "")}
                </div>
              )}
              {defect.verifyNote && (
                <div className="text-xs">
                  {m.verified(defect.verifyNote, defect.verifiedByName ?? "")}
                </div>
              )}
              {defect.cancelNote && (
                <div className="text-xs">{defect.cancelNote}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={m.form.title}
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
              {m.form.title}
              <Input
                value={draft.title}
                maxLength={255}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.sow}
              <Select
                className="w-full"
                showSearch
                optionFilterProp="label"
                value={draft.sowRef ?? undefined}
                onChange={(value: string) =>
                  setDraft({ ...draft, sowRef: value })
                }
                options={view.choices.map((row) => ({
                  value: row.ref,
                  label: row.text,
                }))}
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                {m.form.severity}
                <Select
                  className="w-full"
                  value={draft.severity}
                  onChange={(value: DefectSeverity) =>
                    setDraft({ ...draft, severity: value })
                  }
                  options={(Object.keys(m.severity) as DefectSeverity[]).map(
                    (value) => ({ value, label: m.severity[value] }),
                  )}
                />
              </label>
              <label className="block text-xs">
                {m.form.foundOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  allowClear={false}
                  value={draft.foundOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    value && setDraft({ ...draft, foundOn: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.assignee}
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={draft.assignee ?? undefined}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, assignee: value ?? null })
                  }
                  options={people.map((person) => ({
                    value: person.id,
                    label: person.name,
                  }))}
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.description}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={moving !== null}
        title={
          moving
            ? `${moving.defect.label} · ${m.actions[moving.action]}`
            : undefined
        }
        onCancel={() => setMoving(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void move()}
        destroyOnHidden
      >
        {moving && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.notes[moving.action]}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={moving.note}
                onChange={(event) =>
                  setMoving({ ...moving, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
