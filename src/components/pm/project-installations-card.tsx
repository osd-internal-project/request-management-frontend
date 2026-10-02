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
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  InstallationPointView,
  ProjectInstallationsView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.installations;

interface Draft {
  point: InstallationPointView | null;
  location: string;
  boqIndex: number | null;
  serialNo: string;
  installedOn: Dayjs | null;
  note: string;
  before: File | null;
  after: File | null;
}

/**
 * CD-216 — installation point by point: where, which BOQ line, the serial,
 * photos before and after; equipment installed against the BOQ.
 */
export function ProjectInstallationsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectInstallationsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/installations`;
  const photoHref = (id: string, which: "before" | "after") =>
    `/api/app/projects/${projectId}/installations/${id}/photo/${which}`;

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, init);
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
    const form = new FormData();
    form.append("location", draft.location);
    form.append(
      "boq_index",
      draft.boqIndex === null ? "" : String(draft.boqIndex),
    );
    form.append("serial_no", draft.serialNo);
    form.append("note", draft.note);
    form.append(
      "installed_on",
      draft.installedOn ? draft.installedOn.format("YYYY-MM-DD") : "",
    );
    if (draft.before) form.append("before", draft.before);
    if (draft.after) form.append("after", draft.after);
    const ok = await call(draft.point ? `${base}/${draft.point.id}` : base, {
      method: "POST",
      body: form,
    });
    if (ok) setDraft(null);
  }

  const open = (point: InstallationPointView | null) => {
    setError(null);
    setDraft({
      point,
      location: point?.location ?? "",
      boqIndex: point?.boqIndex ?? null,
      serialNo: point?.serialNo ?? "",
      installedOn: point?.installedOn ? dayjs(point.installedOn) : null,
      note: point?.note ?? "",
      before: null,
      after: null,
    });
  };

  return (
    <Card
      size="small"
      title={`${m.title} · ${m.installed(view.installed, view.points.length)}`}
      extra={
        view.canWrite ? (
          <Button size="small" type="primary" onClick={() => open(null)}>
            {m.add}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && !draft && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.boq.length > 0 && (
        <div className="mb-3">
          <Text strong className="text-xs">
            {m.boq}
          </Text>
          {view.boq.map((line) => (
            <div key={line.ref} className="flex flex-wrap gap-2 text-xs">
              <span>{line.label}</span>
              <span>{m.boqLine(line.installed, line.quantity)}</span>
              <Tag color={line.matches ? "success" : "warning"}>
                {line.matches ? m.matches : m.mismatch}
              </Tag>
            </div>
          ))}
        </div>
      )}

      {view.points.length ? (
        <div className="divide-y">
          {view.points.map((point) => (
            <div key={point.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {point.label} · {point.location}
                  </span>{" "}
                  {point.installedOn ? (
                    <Tag color="success">
                      {m.done(
                        dayjs(point.installedOn).format("D MMM YY"),
                        point.installedByName ?? "",
                      )}
                    </Tag>
                  ) : (
                    <Tag>{m.planned}</Tag>
                  )}
                </div>
                {view.canWrite && (
                  <Space size={0} wrap>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => open(point)}
                    >
                      {m.edit}
                    </Button>
                    {point.mayRemove && (
                      <Popconfirm
                        title={m.removeConfirm}
                        onConfirm={() =>
                          void call(`${base}/${point.id}`, { method: "DELETE" })
                        }
                      >
                        <Button size="small" type="link" danger>
                          {m.remove}
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {[point.boqLabel, point.serialNo && m.serial(point.serialNo)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <div className="text-xs">
                {point.beforeName && (
                  <a
                    className="mr-2"
                    href={photoHref(point.id, "before")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {m.before}
                  </a>
                )}
                {point.afterName && (
                  <a
                    href={photoHref(point.id, "after")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {m.after}
                  </a>
                )}
              </div>
              {point.note && (
                <div className="text-xs whitespace-pre-line">{point.note}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={
          draft?.point ? m.form.editTitle(draft.point.label) : m.form.addTitle
        }
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
              {m.form.location}
              <Input
                value={draft.location}
                maxLength={1000}
                onChange={(event) =>
                  setDraft({ ...draft, location: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.boq}
              <Select
                className="w-full"
                allowClear
                value={draft.boqIndex ?? undefined}
                onChange={(value?: number) =>
                  setDraft({ ...draft, boqIndex: value ?? null })
                }
                options={view.choices.map((row) => ({
                  value: row.index,
                  label: row.label,
                }))}
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.serial}
                <Input
                  value={draft.serialNo}
                  maxLength={100}
                  onChange={(event) =>
                    setDraft({ ...draft, serialNo: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.installedOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.installedOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    setDraft({ ...draft, installedOn: value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={2}
                maxLength={1000}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </label>
            {(["before", "after"] as const).map((which) => (
              <label key={which} className="block text-xs">
                {m.form[which]}
                {draft.point?.[`${which}Name`] && (
                  <Text type="secondary" className="block text-xs">
                    {m.form.keep(draft.point[`${which}Name`] ?? "")}
                  </Text>
                )}
                <input
                  type="file"
                  className="block text-sm"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [which]: event.target.files?.[0] ?? null,
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
      </Modal>
    </Card>
  );
}
