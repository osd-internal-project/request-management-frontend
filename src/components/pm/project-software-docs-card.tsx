"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ProjectSoftwareDocsView,
  SoftwareDocumentRow,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.softwareDocs;

interface Attaching {
  title: string;
  releaseId: string | null;
  note: string;
  file: File | null;
}

/**
 * CD-215 — the software's as-built: the documents named in CRM settings,
 * each file for one version; complete for the version on production.
 */
export function ProjectSoftwareDocsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectSoftwareDocsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [attaching, setAttaching] = useState<Attaching | null>(null);
  const [carrying, setCarrying] = useState<{
    doc: SoftwareDocumentRow;
    releaseId: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/software-docs`;
  const fileHref = (id: string) => `/api/app/${base}/${id}/file`;

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
    if (!attaching) return;
    const form = new FormData();
    form.append("title", attaching.title);
    form.append("release_id", attaching.releaseId ?? "");
    if (attaching.note.trim()) form.append("note", attaching.note);
    if (attaching.file) form.append("file", attaching.file);
    if (await call(base, { method: "POST", body: form })) setAttaching(null);
  }

  async function carry() {
    if (!carrying) return;
    const ok = await call(`${base}/${carrying.doc.id}/carry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ release_id: carrying.releaseId ?? "" }),
    });
    if (ok) setCarrying(null);
  }

  const open = (title: string) => {
    setError(null);
    setAttaching({
      title,
      releaseId: view.target?.id ?? view.releases[0]?.id ?? null,
      note: "",
      file: null,
    });
  };

  const releaseOptions = view.releases.map((row) => ({
    value: row.id,
    label: row.version,
  }));

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title}{" "}
          {view.complete ? (
            <Tag color="success">{m.complete}</Tag>
          ) : (
            <Tag color="warning">{m.missing(view.missing.length)}</Tag>
          )}
        </span>
      }
      extra={
        view.canWrite && view.releases.length > 0 ? (
          <Button size="small" type="primary" onClick={() => open("")}>
            {m.attach}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && !attaching && !carrying && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}
      <Text className="mb-2 block text-sm">
        {view.target
          ? m.target(view.target.version, view.target.basis === "production")
          : m.noTarget}
      </Text>
      {!view.releases.length && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.noReleases}
        </Text>
      )}

      {view.required.length > 0 && (
        <div className="mb-3">
          {view.required.map((row) => (
            <div
              key={row.title}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                {row.documentIds.length ? (
                  <Tag color="success">{m.have}</Tag>
                ) : (
                  <Tag>{m.none}</Tag>
                )}
                {row.title}
              </span>
              {view.canWrite &&
                view.releases.length > 0 &&
                !row.documentIds.length && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => open(row.title)}
                  >
                    {m.attach}
                  </Button>
                )}
            </div>
          ))}
        </div>
      )}

      {view.documents.length ? (
        <div className="divide-y">
          {view.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-start justify-between gap-2 py-1 text-sm"
            >
              <div>
                <Tag>{doc.version}</Tag>
                <a href={fileHref(doc.id)} target="_blank" rel="noreferrer">
                  {doc.title}
                </a>
                <Text type="secondary" className="block text-xs">
                  {[
                    doc.fileName,
                    doc.uploadedByName,
                    dayjs(doc.uploadedAt).format("D MMM YY"),
                    doc.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
              {view.canWrite && (
                <span>
                  {view.releases.length > 1 && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setCarrying({ doc, releaseId: null });
                      }}
                    >
                      {m.carry}
                    </Button>
                  )}
                  {doc.mayRemove && (
                    <Popconfirm
                      title={m.removeConfirm}
                      onConfirm={() =>
                        void call(`${base}/${doc.id}`, { method: "DELETE" })
                      }
                    >
                      <Button size="small" type="link" danger>
                        {m.remove}
                      </Button>
                    </Popconfirm>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={attaching !== null}
        title={m.attach}
        onCancel={() => setAttaching(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void attach()}
        destroyOnHidden
      >
        {attaching && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.title}
              <AutoComplete
                className="w-full"
                value={attaching.title}
                options={view.required.map((row) => ({ value: row.title }))}
                onChange={(value: string) =>
                  setAttaching({ ...attaching, title: value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.release}
              <Select
                className="w-full"
                value={attaching.releaseId ?? undefined}
                options={releaseOptions}
                onChange={(value: string) =>
                  setAttaching({ ...attaching, releaseId: value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={attaching.note}
                onChange={(event) =>
                  setAttaching({ ...attaching, note: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.file}
              <input
                type="file"
                className="block text-sm"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(event) =>
                  setAttaching({
                    ...attaching,
                    file: event.target.files?.[0] ?? null,
                  })
                }
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={carrying !== null}
        title={carrying ? `${m.carry} — ${carrying.doc.title}` : undefined}
        onCancel={() => setCarrying(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void carry()}
        destroyOnHidden
      >
        {carrying && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <Text type="secondary" className="block text-xs">
              {m.carryHint}
            </Text>
            <Select
              className="w-full"
              value={carrying.releaseId ?? undefined}
              options={releaseOptions.filter(
                (row) => row.value !== carrying.doc.releaseId,
              )}
              onChange={(value: string) =>
                setCarrying({ ...carrying, releaseId: value })
              }
            />
          </div>
        )}
      </Modal>
    </Card>
  );
}
