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
  Popconfirm,
  Space,
  Tag,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { DesignVersionView, ProjectDesignsView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.designs;

/** A version as read: its words, its settings, its files. */
function VersionBody({
  projectId,
  version,
}: {
  readonly projectId: string;
  readonly version: DesignVersionView;
}) {
  return (
    <div className="space-y-1 text-xs">
      {version.summary && (
        <div className="whitespace-pre-line">{version.summary}</div>
      )}
      <div>
        {version.differsFromSolution
          ? m.differs(version.differences ?? "")
          : m.same}
      </div>
      {version.configuration.length > 0 && (
        <div>
          <Text strong className="text-xs">
            {m.settings}
          </Text>
          {version.configuration.map((row) => (
            <div key={row.key}>
              {row.key}: <span className="font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {version.files.map((file) => (
        <div key={file.id}>
          <a
            href={`/api/app/projects/${projectId}/design-files/${file.id}`}
            target="_blank"
            rel="noreferrer"
          >
            {file.fileName}
          </a>
        </div>
      ))}
      {version.request && (
        <a href={ROUTES.requestDetail(version.request.id)}>
          {m.request(version.request.requestNo ?? "")}
        </a>
      )}
    </div>
  );
}

/**
 * CD-211 — the detailed design: the version in force, the draft being
 * worked on (settings, drawings, how it differs from the Solution), and the
 * versions before.
 */
export function ProjectDesignsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectDesignsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const open = view.versions.find((row) => row.id === view.openId) ?? null;
  const draft = open?.status === "draft" ? open : null;
  const [title, setTitle] = useState(draft?.title ?? "");
  const [summary, setSummary] = useState(draft?.summary ?? "");
  const [settings, setSettings] = useState(draft?.configuration ?? []);
  const [differs, setDiffers] = useState(draft?.differsFromSolution ?? false);
  const [differences, setDifferences] = useState(draft?.differences ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/designs`;
  const older = view.versions.filter((row) => row.id !== view.openId);

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

  const body = () =>
    JSON.stringify({
      title,
      summary,
      configuration: settings.filter((row) => row.key.trim()),
      differs_from_solution: differs,
      differences,
    });

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          {view.inForce ? (
            <Tag color="success">{m.inForce(view.inForce.label)}</Tag>
          ) : (
            <Tag>{m.none}</Tag>
          )}
        </Space>
      }
      extra={
        view.canWrite && !view.openId ? (
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() => void call(base, { method: "POST" })}
          >
            {m.newVersion}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}

      {open && (
        <div className="mb-3 rounded border border-gray-200 p-2">
          <Space size={4} className="mb-1">
            <span className="font-medium">
              {open.label} · {open.title}
            </span>
            <Tag color={m.statusColor[open.status]}>
              {m.status[open.status]}
            </Tag>
          </Space>
          {open.error && (
            <Alert
              className="mb-2"
              type="warning"
              showIcon
              title={open.error}
            />
          )}
          {draft && view.canWrite ? (
            <div className="space-y-2">
              <label className="block text-xs">
                {m.form.title}
                <Input
                  value={title}
                  maxLength={255}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="block text-xs">
                {m.form.summary}
                <Input.TextArea
                  rows={2}
                  maxLength={4000}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
              <div>
                <Text className="block text-xs">{m.settings}</Text>
                {settings.map((row, index) => (
                  <div
                    key={index}
                    className="mt-1 grid grid-cols-[1fr_1fr_32px] gap-1"
                  >
                    <Input
                      placeholder={m.form.key}
                      value={row.key}
                      onChange={(event) => {
                        const next = [...settings];
                        next[index] = { ...row, key: event.target.value };
                        setSettings(next);
                      }}
                    />
                    <Input
                      placeholder={m.form.value}
                      value={row.value}
                      onChange={(event) => {
                        const next = [...settings];
                        next[index] = { ...row, value: event.target.value };
                        setSettings(next);
                      }}
                    />
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        setSettings(settings.filter((_, i) => i !== index))
                      }
                    />
                  </div>
                ))}
                <Button
                  size="small"
                  type="link"
                  onClick={() =>
                    setSettings([...settings, { key: "", value: "" }])
                  }
                >
                  {m.form.addSetting}
                </Button>
              </div>
              <Checkbox
                checked={differs}
                onChange={(event) => setDiffers(event.target.checked)}
              >
                {m.form.differs}
              </Checkbox>
              {differs && (
                <label className="block text-xs">
                  {m.form.differences}
                  <Input.TextArea
                    rows={2}
                    maxLength={4000}
                    value={differences}
                    onChange={(event) => setDifferences(event.target.value)}
                  />
                </label>
              )}
              <div>
                <Text className="block text-xs">{m.files}</Text>
                {draft.files.map((file) => (
                  <div key={file.id} className="text-xs">
                    <a
                      href={`/api/app/projects/${projectId}/design-files/${file.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {file.fileName}
                    </a>
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() =>
                        void call(`${base}/${draft.id}/files/${file.id}`, {
                          method: "DELETE",
                        })
                      }
                    >
                      {m.remove}
                    </Button>
                  </div>
                ))}
                <input
                  type="file"
                  className="mt-1 block text-sm"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    void call(`${base}/${draft.id}/files`, {
                      method: "POST",
                      body: form,
                    });
                    event.target.value = "";
                  }}
                />
              </div>
              {!view.typeConfigured && view.canEdit && (
                <Alert type="info" showIcon title={m.notConfigured} />
              )}
              <Space wrap>
                <Button
                  size="small"
                  loading={busy}
                  onClick={() =>
                    void call(`${base}/${draft.id}`, {
                      method: "PATCH",
                      body: body(),
                    })
                  }
                >
                  {m.save}
                </Button>
                {view.canEdit && (
                  <Popconfirm
                    title={m.submitConfirm}
                    disabled={!view.typeConfigured}
                    onConfirm={async () => {
                      const saved = await appApi(`${base}/${draft.id}`, {
                        method: "PATCH",
                        body: body(),
                      });
                      if (!saved.ok) {
                        setError(saved.message);
                        return;
                      }
                      await call(`${base}/${draft.id}/submit`, {
                        method: "POST",
                      });
                    }}
                  >
                    <Button
                      size="small"
                      type="primary"
                      loading={busy}
                      disabled={!view.typeConfigured}
                    >
                      {m.submit}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          ) : (
            <VersionBody projectId={projectId} version={open} />
          )}
        </div>
      )}

      {older.length > 0 ? (
        <Collapse
          size="small"
          defaultActiveKey={view.inForce && !open ? [view.inForce.id] : []}
          items={older.map((version) => ({
            key: version.id,
            label: (
              <Space size={4} wrap>
                <span>
                  {version.label} · {version.title}
                </span>
                <Tag color={m.statusColor[version.status]}>
                  {m.status[version.status]}
                </Tag>
                {version.inForce && <Tag color="success">{m.current}</Tag>}
              </Space>
            ),
            children: <VersionBody projectId={projectId} version={version} />,
          }))}
        />
      ) : (
        !open && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
        )
      )}
    </Card>
  );
}
