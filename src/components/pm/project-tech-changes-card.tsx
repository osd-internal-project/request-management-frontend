"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
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
import { appApi } from "@/lib/api/client";
import type { ProjectTechChangesView, TechChangeRow } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.techChanges;

const statusColor: Record<string, string> = {
  draft: "default",
  submitted: "processing",
  approved: "success",
  rejected: "error",
};

interface LineForm {
  ref: string | null;
  name: string;
  unit: string;
  quantityTo: number | null;
  unitCost: number | null;
}

interface Editing {
  row: TechChangeRow | null;
  title: string;
  reason: string;
  description: string;
  lines: LineForm[];
  affectsScope: boolean;
  scopeAdded: string;
  scopeRemoved: string;
}

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

/**
 * CD-224 — technical changes with their BOQ, cost and scope impact; a scope
 * change carries a change request; in force, it goes into the as-built.
 */
export function ProjectTechChangesCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectTechChangesView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/tech-changes`;

  async function send(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
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
    if (!editing) return;
    const body = {
      title: editing.title,
      reason: editing.reason,
      description: editing.description,
      affects_scope: editing.affectsScope,
      scope_added: editing.scopeAdded,
      scope_removed: editing.scopeRemoved,
      lines: editing.lines.map((line) => ({
        ref: line.ref,
        name: line.name,
        unit: line.unit,
        quantity_to: line.quantityTo ?? 0,
        ...(line.unitCost === null ? {} : { unit_cost: line.unitCost }),
      })),
    };
    const ok = editing.row
      ? await send(`${base}/${editing.row.id}`, "PUT", body)
      : await send(base, "POST", body);
    if (ok) setEditing(null);
  }

  const open = (row: TechChangeRow | null) => {
    setError(null);
    setEditing({
      row,
      title: row?.title ?? "",
      reason: row?.reason ?? "",
      description: row?.description ?? "",
      lines:
        row?.lines.map((line) => ({
          ref: line.ref,
          name: line.ref ? "" : line.name,
          unit: line.ref ? "" : line.unit,
          quantityTo: line.quantityTo,
          unitCost: line.unitCost,
        })) ?? [],
      affectsScope: row?.affectsScope ?? false,
      scopeAdded: row?.scopeAdded ?? "",
      scopeRemoved: row?.scopeRemoved ?? "",
    });
  };

  const setLine = (index: number, patch: Partial<LineForm>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      lines: editing.lines.map((line, at) =>
        at === index ? { ...line, ...patch } : line,
      ),
    });
  };

  return (
    <Card
      size="small"
      title={m.title}
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
      {!view.typeSet && view.canEdit && (
        <Alert className="mb-2" type="warning" showIcon title={m.noType} />
      )}
      {error && !editing && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}
      {view.changes.length ? (
        <div className="divide-y">
          {view.changes.map((row) => (
            <div key={row.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {row.label} · {row.title}
                  </span>{" "}
                  <Tag color={statusColor[row.status]}>
                    {m.status[row.status] ?? row.status}
                  </Tag>
                  {row.affectsScope && (
                    <Tag color="orange">{m.affectsScope}</Tag>
                  )}
                  {row.change && <Tag>{row.change.label}</Tag>}
                </div>
                <Space size={0} wrap>
                  {row.mayEdit && (
                    <Button size="small" type="link" onClick={() => open(row)}>
                      {m.edit}
                    </Button>
                  )}
                  {row.status === "draft" &&
                    row.affectsScope &&
                    !row.change &&
                    view.canEdit && (
                      <Button
                        size="small"
                        type="link"
                        loading={busy}
                        onClick={() =>
                          void send(`${base}/${row.id}/change-request`, "POST")
                        }
                      >
                        {m.openCr}
                      </Button>
                    )}
                  {row.status === "draft" && view.canEdit && (
                    <Popconfirm
                      title={m.submitConfirm}
                      onConfirm={() =>
                        void send(`${base}/${row.id}/submit`, "POST")
                      }
                    >
                      <Button size="small" type="link">
                        {m.submit}
                      </Button>
                    </Popconfirm>
                  )}
                  {row.mayEdit && (
                    <Popconfirm
                      title={m.cancelConfirm}
                      onConfirm={() =>
                        void send(`${base}/${row.id}/cancel`, "POST")
                      }
                    >
                      <Button size="small" type="link" danger>
                        {m.cancel}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>
              {row.reason && <div className="text-xs">{row.reason}</div>}
              {row.description && (
                <div className="text-xs whitespace-pre-line">
                  {row.description}
                </div>
              )}
              {row.lines.map((line, index) => (
                <Text
                  key={`${row.id}-${index}`}
                  type="secondary"
                  className="block text-xs"
                >
                  {line.name}: {line.quantityFrom} → {line.quantityTo}
                  {line.unit ? ` ${line.unit}` : ""}
                </Text>
              ))}
              <Text className="block text-xs">
                {m.cost(baht(row.costChange))}
                {row.requestNo ? ` · ${m.request(row.requestNo)}` : ""}
              </Text>
              {row.inForce ? (
                <Tag color="success" className="mt-1">
                  {m.inForce}
                </Tag>
              ) : (
                row.status === "approved" &&
                row.change && (
                  <Tag color="warning" className="mt-1">
                    {m.waitingCr(row.change.label)}
                  </Tag>
                )
              )}
              {row.error && (
                <Text type="danger" className="block text-xs">
                  {row.error}
                </Text>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={editing !== null}
        title={editing?.row ? `${m.edit} ${editing.row.label}` : m.add}
        onCancel={() => setEditing(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        width={760}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.title}
              <Input
                value={editing.title}
                maxLength={255}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.reason}
              <Input.TextArea
                rows={2}
                maxLength={4000}
                value={editing.reason}
                onChange={(event) =>
                  setEditing({ ...editing, reason: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.description}
              <Input.TextArea
                rows={2}
                maxLength={4000}
                value={editing.description}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </label>
            <Text strong className="block text-xs">
              {m.form.lines}
            </Text>
            {editing.lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1.5fr_0.7fr_1fr_1fr_auto]"
              >
                <Select
                  allowClear
                  placeholder={m.form.boq}
                  value={line.ref ?? undefined}
                  options={view.boq.map((row) => ({
                    value: row.ref,
                    label: row.label,
                  }))}
                  onChange={(value?: string) =>
                    setLine(index, { ref: value ?? null })
                  }
                />
                <Input
                  placeholder={m.form.name}
                  value={line.name}
                  maxLength={255}
                  disabled={Boolean(line.ref)}
                  onChange={(event) =>
                    setLine(index, { name: event.target.value })
                  }
                />
                <Input
                  placeholder={m.form.unit}
                  value={line.unit}
                  maxLength={30}
                  disabled={Boolean(line.ref)}
                  onChange={(event) =>
                    setLine(index, { unit: event.target.value })
                  }
                />
                <InputNumber
                  className="w-full"
                  min={0}
                  placeholder={m.form.quantityTo}
                  value={line.quantityTo}
                  onChange={(value) => setLine(index, { quantityTo: value })}
                />
                <InputNumber
                  className="w-full"
                  min={0}
                  placeholder={m.form.unitCost}
                  value={line.unitCost}
                  onChange={(value) => setLine(index, { unitCost: value })}
                />
                <Button
                  danger
                  type="text"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      lines: editing.lines.filter((_, at) => at !== index),
                    })
                  }
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              size="small"
              onClick={() =>
                setEditing({
                  ...editing,
                  lines: [
                    ...editing.lines,
                    {
                      ref: null,
                      name: "",
                      unit: "",
                      quantityTo: null,
                      unitCost: null,
                    },
                  ],
                })
              }
            >
              {m.form.addLine}
            </Button>
            <Checkbox
              checked={editing.affectsScope}
              onChange={(event) =>
                setEditing({ ...editing, affectsScope: event.target.checked })
              }
            >
              {m.form.affectsScope}
            </Checkbox>
            {editing.affectsScope && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs">
                  {m.form.scopeAdded}
                  <Input.TextArea
                    rows={2}
                    maxLength={4000}
                    value={editing.scopeAdded}
                    onChange={(event) =>
                      setEditing({ ...editing, scopeAdded: event.target.value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {m.form.scopeRemoved}
                  <Input.TextArea
                    rows={2}
                    maxLength={4000}
                    value={editing.scopeRemoved}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        scopeRemoved: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
