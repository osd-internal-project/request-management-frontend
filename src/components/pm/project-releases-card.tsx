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
  EnvKind,
  ProjectEnvironmentView,
  ProjectReleasesView,
  ReleaseView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.releases;

const kindColor: Record<string, string> = {
  dev: "default",
  uat: "processing",
  production: "success",
};

const when = (value: string) => dayjs(value).format("D MMM YY HH:mm");

type Form =
  | {
      kind: "environment";
      env: ProjectEnvironmentView | null;
      envKind: EnvKind;
      name: string;
      url: string;
      note: string;
    }
  | { kind: "release"; version: string; notes: string }
  | {
      kind: "deploy";
      release: ReleaseView;
      environmentId: string | null;
      deployedAt: Dayjs | null;
      note: string;
      overrideReason: string;
    };

/**
 * CD-214 — the versions made for the customer and where each runs: dev,
 * UAT, production. Production waits for UAT and for no blocker open.
 */
export function ProjectReleasesCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectReleasesView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}`;

  async function call(path: string, method: string, body?: unknown) {
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
    if (!form) return;
    let ok = false;
    if (form.kind === "environment") {
      const body = {
        kind: form.envKind,
        name: form.name,
        url: form.url,
        note: form.note,
      };
      ok = form.env
        ? await call(`${base}/environments/${form.env.id}`, "PUT", body)
        : await call(`${base}/environments`, "POST", body);
    } else if (form.kind === "release") {
      ok = await call(`${base}/releases`, "POST", {
        version: form.version,
        notes: form.notes,
      });
    } else {
      ok = await call(`${base}/releases/${form.release.id}/deploy`, "POST", {
        environment_id: form.environmentId ?? "",
        ...(form.deployedAt
          ? { deployed_at: form.deployedAt.toISOString() }
          : {}),
        note: form.note,
        ...(form.overrideReason.trim()
          ? { override_reason: form.overrideReason }
          : {}),
      });
    }
    if (ok) setForm(null);
  }

  const open = (next: Form) => {
    setError(null);
    setForm(next);
  };

  const target =
    form?.kind === "deploy"
      ? view.environments.find((env) => env.id === form.environmentId)
      : undefined;

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        view.canWrite && view.environments.length > 0 ? (
          <Button
            size="small"
            type="primary"
            onClick={() => open({ kind: "release", version: "", notes: "" })}
          >
            {m.addRelease}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {view.blockers > 0 && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={m.blockers(view.blockers)}
        />
      )}
      {error && !form && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      <div className="mb-1 flex items-center justify-between">
        <Text strong className="text-xs">
          {m.environments}
        </Text>
        {view.canEdit && (
          <Button
            size="small"
            type="link"
            onClick={() =>
              open({
                kind: "environment",
                env: null,
                envKind: "dev",
                name: "",
                url: "",
                note: "",
              })
            }
          >
            {m.addEnvironment}
          </Button>
        )}
      </div>
      {view.environments.length ? (
        <div className="mb-3">
          {view.environments.map((env) => (
            <div
              key={env.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span>
                <Tag color={kindColor[env.kind]}>{m.kinds[env.kind]}</Tag>
                {env.url ? (
                  <a href={env.url} target="_blank" rel="noreferrer">
                    {env.name}
                  </a>
                ) : (
                  env.name
                )}{" "}
                <Text type="secondary" className="text-xs">
                  {env.current
                    ? m.running(
                        env.current.version,
                        when(env.current.deployedAt),
                        env.current.deployedByName ?? "",
                      )
                    : m.nothing}
                </Text>
              </span>
              {view.canEdit && (
                <Space size={0}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      open({
                        kind: "environment",
                        env,
                        envKind: env.kind,
                        name: env.name,
                        url: env.url ?? "",
                        note: env.note ?? "",
                      })
                    }
                  >
                    {m.edit}
                  </Button>
                  <Popconfirm
                    title={m.removeConfirm}
                    onConfirm={() =>
                      void call(`${base}/environments/${env.id}`, "DELETE")
                    }
                  >
                    <Button size="small" type="link" danger>
                      {m.remove}
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Text type="secondary" className="mb-3 block text-xs">
          {m.noEnvironments}
        </Text>
      )}

      <Text strong className="text-xs">
        {m.releases}
      </Text>
      {view.releases.length ? (
        <div className="divide-y">
          {view.releases.map((release) => (
            <div key={release.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{release.version}</span>{" "}
                  {release.runningOn.length > 0 && (
                    <Tag color="success">
                      {m.runningOn(release.runningOn.join(", "))}
                    </Tag>
                  )}
                </div>
                {view.canWrite && view.environments.length > 0 && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      open({
                        kind: "deploy",
                        release,
                        environmentId: null,
                        deployedAt: null,
                        note: "",
                        overrideReason: "",
                      })
                    }
                  >
                    {m.deploy}
                  </Button>
                )}
              </div>
              {release.notes && (
                <div className="text-xs whitespace-pre-line">
                  {release.notes}
                </div>
              )}
              {release.deployments.map((row) => (
                <Text key={row.id} type="secondary" className="block text-xs">
                  {[
                    `${row.environment} · ${when(row.deployedAt)}`,
                    row.deployedByName,
                    row.note,
                    row.overrideReason && m.override(row.overrideReason),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={m.noReleases}
        />
      )}

      <Modal
        open={form !== null}
        title={
          form?.kind === "environment"
            ? m.form.environment
            : form?.kind === "release"
              ? m.addRelease
              : form
                ? `${m.deploy} ${form.release.version}`
                : undefined
        }
        onCancel={() => setForm(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {form && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            {form.kind === "environment" && (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block text-xs">
                    {m.form.kind}
                    <Select
                      className="w-full"
                      value={form.envKind}
                      onChange={(value: EnvKind) =>
                        setForm({ ...form, envKind: value })
                      }
                      options={(Object.keys(m.kinds) as EnvKind[]).map(
                        (value) => ({ value, label: m.kinds[value] }),
                      )}
                    />
                  </label>
                  <label className="block text-xs">
                    {m.form.name}
                    <Input
                      value={form.name}
                      maxLength={100}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  {m.form.url}
                  <Input
                    value={form.url}
                    maxLength={500}
                    placeholder="https://"
                    onChange={(event) =>
                      setForm({ ...form, url: event.target.value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {m.form.note}
                  <Input.TextArea
                    rows={2}
                    maxLength={4000}
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {form.kind === "release" && (
              <>
                <label className="block text-xs">
                  {m.form.version}
                  <Input
                    value={form.version}
                    maxLength={50}
                    placeholder="1.0.0"
                    onChange={(event) =>
                      setForm({ ...form, version: event.target.value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {m.form.notes}
                  <Input.TextArea
                    rows={3}
                    maxLength={4000}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {form.kind === "deploy" && (
              <>
                <label className="block text-xs">
                  {m.form.deployTo}
                  <Select
                    className="w-full"
                    value={form.environmentId ?? undefined}
                    onChange={(value: string) =>
                      setForm({ ...form, environmentId: value })
                    }
                    options={view.environments.map((env) => ({
                      value: env.id,
                      label: `${m.kinds[env.kind]} · ${env.name}`,
                    }))}
                  />
                </label>
                <label className="block text-xs">
                  {m.form.deployedAt}
                  <DatePicker
                    className="w-full"
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    value={form.deployedAt}
                    disabledDate={(value) => value.isAfter(dayjs(), "day")}
                    onChange={(value) =>
                      setForm({ ...form, deployedAt: value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {m.form.note}
                  <Input.TextArea
                    rows={2}
                    maxLength={4000}
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                  />
                </label>
                {target?.kind === "production" && view.canEdit && (
                  <label className="block text-xs">
                    {m.form.overrideReason}
                    <Input.TextArea
                      rows={2}
                      maxLength={4000}
                      value={form.overrideReason}
                      onChange={(event) =>
                        setForm({ ...form, overrideReason: event.target.value })
                      }
                    />
                  </label>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
