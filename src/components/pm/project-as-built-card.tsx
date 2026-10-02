"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  AsBuiltDeviationView,
  AsBuiltDocumentView,
  ProjectAsBuiltView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.asBuilt;

interface Deviation {
  id?: string;
  label: string | null;
  reference: string | null;
  planned: string;
  built: string;
  reason: string;
  affectsScope: boolean;
  changeRequestId: string | null;
}

/**
 * CD-226 — the project as built: the as-built documents the company asks
 * for, and every point where what was built differs from what was sold.
 */
export function ProjectAsBuiltCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectAsBuiltView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [attaching, setAttaching] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [deviation, setDeviation] = useState<Deviation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/as-built`;
  const fileHref = (id: string) =>
    `/api/app/projects/${projectId}/as-built/documents/${id}/file`;
  const others = view.documents.filter(
    (doc) => !view.required.some((row) => row.documentIds.includes(doc.id)),
  );

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

  async function attach() {
    if (attaching === null) return;
    if (!attaching.trim() || !file) {
      setError(m.form.required);
      return;
    }
    const form = new FormData();
    form.append("title", attaching);
    if (note.trim()) form.append("note", note);
    form.append("file", file);
    const ok = await call(`${base}/documents`, { method: "POST", body: form });
    if (ok) setAttaching(null);
  }

  async function saveDeviation() {
    if (!deviation) return;
    const body: Record<string, unknown> = {
      reference: deviation.reference ?? "",
      planned: deviation.planned,
      built: deviation.built,
      reason: deviation.reason,
      affects_scope: deviation.affectsScope,
    };
    if (view.canEdit) body.change_request_id = deviation.changeRequestId ?? "";
    const ok = await call(
      deviation.id
        ? `${base}/deviations/${deviation.id}`
        : `${base}/deviations`,
      {
        method: deviation.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      },
    );
    if (ok) setDeviation(null);
  }

  const openAttach = (title: string) => {
    setError(null);
    setFile(null);
    setNote("");
    setAttaching(title);
  };
  const documentLine = (doc: AsBuiltDocumentView) => (
    <div key={doc.id} className="pl-3 text-xs">
      <a href={fileHref(doc.id)} target="_blank" rel="noreferrer">
        {doc.fileName}
      </a>
      <Text type="secondary" className="ml-1 text-xs">
        {m.by(
          doc.uploadedByName ?? "",
          dayjs(doc.uploadedAt).format("D MMM YY"),
        )}
      </Text>
      {view.canWrite && doc.mayRemove && (
        <Popconfirm
          title={m.removeConfirm}
          onConfirm={() =>
            void call(`${base}/documents/${doc.id}`, { method: "DELETE" })
          }
        >
          <Button size="small" type="link" danger>
            {m.remove}
          </Button>
        </Popconfirm>
      )}
    </div>
  );
  const editDeviation = (row: AsBuiltDeviationView) => {
    setError(null);
    setDeviation({
      id: row.id,
      label: row.label,
      reference: row.reference,
      planned: row.planned,
      built: row.built,
      reason: row.reason ?? "",
      affectsScope: row.affectsScope,
      changeRequestId: row.changeRequestId,
    });
  };

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          <Tag color={view.complete ? "success" : "warning"}>
            {view.complete ? m.complete : m.incomplete}
          </Tag>
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && attaching === null && !deviation && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <Text strong className="text-sm">
            {m.documents}
          </Text>
          {view.canWrite && (
            <Button size="small" type="link" onClick={() => openAttach("")}>
              {m.attachOther}
            </Button>
          )}
        </div>
        {view.required.map((row) => (
          <div key={row.title} className="py-1 text-sm">
            <span className="font-medium">{row.title}</span>{" "}
            <Tag color={row.documentIds.length ? "success" : "red"}>
              {row.documentIds.length ? m.attached : m.missing}
            </Tag>
            {view.canWrite && (
              <Button
                size="small"
                type="link"
                onClick={() => openAttach(row.title)}
              >
                {m.attach}
              </Button>
            )}
            {view.documents
              .filter((doc) => row.documentIds.includes(doc.id))
              .map(documentLine)}
          </div>
        ))}
        {others.length > 0 && (
          <div className="py-1 text-sm">
            <span className="font-medium">{m.others}</span>
            {others.map((doc) => (
              <div key={doc.id}>
                <Text className="pl-3 text-xs">{doc.title}</Text>
                {documentLine(doc)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <Text strong className="text-sm">
            {m.deviations} · {view.deviations.length}
          </Text>
          {view.canWrite && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setError(null);
                setDeviation({
                  label: null,
                  reference: null,
                  planned: "",
                  built: "",
                  reason: "",
                  affectsScope: false,
                  changeRequestId: null,
                });
              }}
            >
              {m.addDeviation}
            </Button>
          )}
        </div>
        {view.openDeviations.length > 0 && (
          <Alert
            className="mb-2"
            type="warning"
            showIcon
            title={view.openDeviations.join(" · ")}
          />
        )}
        {view.deviations.length === 0 && (
          <Text type="secondary" className="block text-xs">
            {m.noDeviations}
          </Text>
        )}
        <div className="divide-y">
          {view.deviations.map((row) => (
            <div key={row.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{row.label}</span>{" "}
                  {row.referenceLabel && (
                    <Text type="secondary" className="text-xs">
                      {row.referenceLabel}
                    </Text>
                  )}
                  {row.affectsScope && (
                    <Tag className="ml-1" color="orange">
                      {m.affectsScope}
                    </Tag>
                  )}
                  {row.change && (
                    <Tag
                      color={
                        row.change.status === "approved" ? "success" : "default"
                      }
                    >
                      {m.change(row.change.label)}
                    </Tag>
                  )}
                </div>
                {row.mayEdit && (
                  <Space size={0}>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => editDeviation(row)}
                    >
                      {m.edit}
                    </Button>
                    <Popconfirm
                      title={m.deleteConfirm}
                      onConfirm={() =>
                        void call(`${base}/deviations/${row.id}`, {
                          method: "DELETE",
                        })
                      }
                    >
                      <Button size="small" type="link" danger>
                        {m.delete}
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </div>
              <div className="text-xs">{m.planned(row.planned)}</div>
              <div className="text-xs">{m.built(row.built)}</div>
              {row.reason ? (
                <div className="text-xs">{m.reason(row.reason)}</div>
              ) : (
                <Text type="danger" className="block text-xs">
                  {m.noReason}
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={attaching !== null}
        title={m.form.attachTitle}
        onCancel={() => setAttaching(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void attach()}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          <label className="block text-xs">
            {m.form.title}
            {view.required.some((row) => row.title === attaching) ? (
              <Input value={attaching ?? ""} disabled />
            ) : (
              <Select
                className="w-full"
                mode="tags"
                maxCount={1}
                value={attaching ? [attaching] : []}
                onChange={(values: string[]) =>
                  setAttaching(values[values.length - 1] ?? "")
                }
                options={view.required.map((row) => ({
                  value: row.title,
                  label: row.title,
                }))}
              />
            )}
          </label>
          <label className="block text-xs">
            {m.form.note}
            <Input
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <label className="block text-xs">
            {m.form.file}
            <input
              type="file"
              className="block text-sm"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={deviation !== null}
        title={m.form.deviationTitle(deviation?.label ?? null)}
        onCancel={() => setDeviation(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void saveDeviation()}
        destroyOnHidden
      >
        {deviation && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.reference}
              <Select
                className="w-full"
                allowClear
                showSearch
                optionFilterProp="label"
                value={deviation.reference ?? undefined}
                onChange={(value?: string) =>
                  setDeviation({ ...deviation, reference: value ?? null })
                }
                options={view.refs.map((row) => ({
                  value: row.ref,
                  label: row.label,
                }))}
              />
            </label>
            <label className="block text-xs">
              {m.form.planned}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={deviation.planned}
                onChange={(event) =>
                  setDeviation({ ...deviation, planned: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.built}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={deviation.built}
                onChange={(event) =>
                  setDeviation({ ...deviation, built: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.reason}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={deviation.reason}
                onChange={(event) =>
                  setDeviation({ ...deviation, reason: event.target.value })
                }
              />
            </label>
            <Checkbox
              checked={deviation.affectsScope}
              onChange={(event) =>
                setDeviation({
                  ...deviation,
                  affectsScope: event.target.checked,
                })
              }
            >
              {m.form.affectsScope}
            </Checkbox>
            {view.canEdit && (
              <label className="block text-xs">
                {m.form.change}
                <Select
                  className="w-full"
                  allowClear
                  value={deviation.changeRequestId ?? undefined}
                  onChange={(value?: string) =>
                    setDeviation({
                      ...deviation,
                      changeRequestId: value ?? null,
                    })
                  }
                  options={view.changes.map((row) => ({
                    value: row.id,
                    label: row.label,
                  }))}
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
