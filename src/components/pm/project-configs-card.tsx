"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ConfigHistoryView,
  ConfigItemRow,
  ProjectConfigsView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.configs;

interface Editing {
  item: ConfigItemRow | null;
  system: string;
  installationId: string | null;
  environmentId: string | null;
  key: string;
  value: string;
  isSecret: boolean;
  note: string;
  reason: string;
}

type Asking =
  | { kind: "remove"; item: ConfigItemRow; reason: string }
  | {
      kind: "restore";
      item: ConfigItemRow;
      historyId: string;
      reason: string;
    };

/**
 * CD-217 — configuration as searchable data: system + key + value on an
 * installation point or environment; secrets masked, revealed one at a
 * time; every change kept with its reason and restorable.
 */
export function ProjectConfigsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectConfigsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [history, setHistory] = useState<{
    item: ConfigItemRow;
    data: ConfigHistoryView | null;
  } | null>(null);
  const [shown, setShown] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/configs`;

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
    const body: Record<string, unknown> = {
      system: editing.system,
      installation_id: editing.installationId ?? "",
      environment_id: editing.environmentId ?? "",
      key: editing.key,
      is_secret: editing.isSecret,
      note: editing.note,
    };
    // an existing secret left blank keeps its value
    if (!(editing.item?.isSecret && editing.isSecret && !editing.value)) {
      body.value = editing.value;
    }
    if (editing.item) body.reason = editing.reason;
    const ok = editing.item
      ? await send(`${base}/${editing.item.id}`, "PUT", body)
      : await send(base, "POST", body);
    if (ok) {
      setShown({});
      setEditing(null);
    }
  }

  async function answer() {
    if (!asking) return;
    const ok =
      asking.kind === "remove"
        ? await send(`${base}/${asking.item.id}/remove`, "POST", {
            reason: asking.reason,
          })
        : await send(
            `${base}/${asking.item.id}/history/${asking.historyId}/restore`,
            "POST",
            { reason: asking.reason },
          );
    if (ok) {
      setShown({});
      setAsking(null);
      setHistory(null);
    }
  }

  async function reveal(item: ConfigItemRow) {
    if (shown[item.id] !== undefined) {
      setShown(
        Object.fromEntries(
          Object.entries(shown).filter(([id]) => id !== item.id),
        ),
      );
      return;
    }
    const response = await appApi<{ value: string }>(
      `${base}/${item.id}/reveal`,
      { method: "POST" },
    );
    if (!response.ok) {
      message.error(response.message);
      return;
    }
    setShown({ ...shown, [item.id]: response.data.value });
  }

  async function openHistory(item: ConfigItemRow) {
    setHistory({ item, data: null });
    const response = await appApi<ConfigHistoryView>(
      `${base}/${item.id}/history`,
    );
    if (!response.ok) {
      message.error(response.message);
      setHistory(null);
      return;
    }
    setHistory({ item, data: response.data });
  }

  const query = q.trim().toLowerCase();
  const rows = view.items.filter(
    (row) =>
      !query ||
      [row.system, row.key, row.isSecret ? "" : row.value, row.note].some(
        (text) => (text ?? "").toLowerCase().includes(query),
      ),
  );

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        <Space size={4}>
          <Link href={ROUTES.projectConfigs} className="text-xs">
            {m.searchAll}
          </Link>
          {view.canWrite && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setError(null);
                setEditing({
                  item: null,
                  system: "",
                  installationId: null,
                  environmentId: null,
                  key: "",
                  value: "",
                  isSecret: false,
                  note: "",
                  reason: "",
                });
              }}
            >
              {m.add}
            </Button>
          )}
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {view.items.length > 5 && (
        <Input.Search
          className="mb-2"
          allowClear
          placeholder={m.search}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      )}
      <Table<ConfigItemRow>
        rowKey="id"
        size="small"
        dataSource={rows}
        pagination={rows.length > 20 ? { pageSize: 20 } : false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 900 }}
        columns={[
          { title: m.columns.label, dataIndex: "label", width: 70 },
          { title: m.columns.system, dataIndex: "system", width: 160 },
          {
            title: m.columns.target,
            width: 160,
            render: (_: unknown, row) =>
              row.installationLabel ?? row.environmentLabel ?? "",
          },
          { title: m.columns.key, dataIndex: "key", width: 150 },
          {
            title: m.columns.value,
            render: (_: unknown, row) => (
              <span className="font-mono text-xs break-all">
                {row.isSecret && <Tag color="purple">{m.secret}</Tag>}
                {shown[row.id] ?? row.value}
                {row.note && (
                  <Text type="secondary" className="block text-xs">
                    {row.note}
                  </Text>
                )}
              </span>
            ),
          },
          {
            title: m.columns.updated,
            width: 140,
            render: (_: unknown, row) => (
              <Text type="secondary" className="text-xs">
                {dayjs(row.updatedAt).format("D MMM YY HH:mm")}
                {row.updatedByName ? ` · ${row.updatedByName}` : ""}
              </Text>
            ),
          },
          {
            title: "",
            width: 200,
            render: (_: unknown, row) => (
              <Space size={0} wrap>
                {row.isSecret && view.canWrite && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => void reveal(row)}
                  >
                    {shown[row.id] !== undefined ? m.hide : m.reveal}
                  </Button>
                )}
                <Button
                  size="small"
                  type="link"
                  onClick={() => void openHistory(row)}
                >
                  {m.history}
                </Button>
                {view.canWrite && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setError(null);
                      setEditing({
                        item: row,
                        system: row.system,
                        installationId: row.installationId,
                        environmentId: row.environmentId,
                        key: row.key,
                        value: row.isSecret ? "" : (row.value ?? ""),
                        isSecret: row.isSecret,
                        note: row.note ?? "",
                        reason: "",
                      });
                    }}
                  >
                    {m.edit}
                  </Button>
                )}
                {view.canWrite && row.mayRemove && (
                  <Button
                    size="small"
                    type="link"
                    danger
                    onClick={() => {
                      setError(null);
                      setAsking({ kind: "remove", item: row, reason: "" });
                    }}
                  >
                    {m.remove}
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing?.item ? `${m.edit} ${editing.item.label}` : m.add}
        onCancel={() => setEditing(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.system}
              <Input
                value={editing.system}
                maxLength={200}
                onChange={(event) =>
                  setEditing({ ...editing, system: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.installation}
                <Select
                  className="w-full"
                  allowClear
                  showSearch={{ optionFilterProp: "label" }}
                  value={editing.installationId ?? undefined}
                  options={view.installations.map((row) => ({
                    value: row.id,
                    label: row.label,
                  }))}
                  onChange={(value?: string) =>
                    setEditing({
                      ...editing,
                      installationId: value ?? null,
                      environmentId: value ? null : editing.environmentId,
                    })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.environment}
                <Select
                  className="w-full"
                  allowClear
                  value={editing.environmentId ?? undefined}
                  options={view.environments.map((row) => ({
                    value: row.id,
                    label: row.label,
                  }))}
                  onChange={(value?: string) =>
                    setEditing({
                      ...editing,
                      environmentId: value ?? null,
                      installationId: value ? null : editing.installationId,
                    })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.key}
              <Input
                value={editing.key}
                maxLength={200}
                onChange={(event) =>
                  setEditing({ ...editing, key: event.target.value })
                }
              />
            </label>
            <Checkbox
              checked={editing.isSecret}
              onChange={(event) =>
                setEditing({ ...editing, isSecret: event.target.checked })
              }
            >
              {m.form.isSecret}
            </Checkbox>
            <label className="block text-xs">
              {m.form.value}
              {editing.isSecret ? (
                <Input.Password
                  value={editing.value}
                  maxLength={4000}
                  autoComplete="new-password"
                  placeholder={
                    editing.item?.isSecret ? m.form.keepSecret : undefined
                  }
                  onChange={(event) =>
                    setEditing({ ...editing, value: event.target.value })
                  }
                />
              ) : (
                <Input.TextArea
                  rows={2}
                  maxLength={4000}
                  value={editing.value}
                  onChange={(event) =>
                    setEditing({ ...editing, value: event.target.value })
                  }
                />
              )}
            </label>
            <label className="block text-xs">
              {m.form.note}
              <Input
                value={editing.note}
                maxLength={2000}
                onChange={(event) =>
                  setEditing({ ...editing, note: event.target.value })
                }
              />
            </label>
            {editing.item && (
              <label className="block text-xs">
                {m.form.reason}
                <Input
                  value={editing.reason}
                  maxLength={1000}
                  onChange={(event) =>
                    setEditing({ ...editing, reason: event.target.value })
                  }
                />
              </label>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={asking !== null}
        title={
          asking
            ? `${asking.kind === "remove" ? m.remove : m.restore} ${asking.item.label}`
            : undefined
        }
        onCancel={() => setAsking(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        okButtonProps={{ danger: asking?.kind === "remove" }}
        confirmLoading={busy}
        onOk={() => void answer()}
        destroyOnHidden
      >
        {asking && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {asking.kind === "remove"
                ? m.form.removeReason
                : m.form.restoreReason}
              <Input
                value={asking.reason}
                maxLength={1000}
                onChange={(event) =>
                  setAsking({ ...asking, reason: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={history !== null}
        title={
          history
            ? `${m.history} ${history.item.label} · ${history.item.key}`
            : undefined
        }
        onCancel={() => setHistory(null)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {history && (
          <Table
            rowKey="id"
            size="small"
            loading={!history.data}
            dataSource={history.data?.entries ?? []}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              {
                title: "",
                width: 110,
                render: (_: unknown, row) => (
                  <Text className="text-xs">
                    {dayjs(row.at).format("D MMM YY HH:mm")}
                  </Text>
                ),
              },
              {
                title: "",
                width: 80,
                render: (_: unknown, row) => (
                  <Tag>{m.actions[row.action] ?? row.action}</Tag>
                ),
              },
              {
                title: "",
                render: (_: unknown, row) => (
                  <span className="font-mono text-xs break-all">
                    {row.oldValue !== null && `${row.oldValue} → `}
                    {row.newValue}
                    {row.reason && (
                      <Text type="secondary" className="block text-xs">
                        {row.reason}
                      </Text>
                    )}
                  </span>
                ),
              },
              { title: "", dataIndex: "actorName", width: 120 },
              {
                title: "",
                width: 90,
                render: (_: unknown, row) =>
                  history.data?.canRestore &&
                  row.restorable &&
                  history.item.id ? (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setAsking({
                          kind: "restore",
                          item: history.item,
                          historyId: row.id,
                          reason: "",
                        });
                      }}
                    >
                      {m.restore}
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Modal>
    </Card>
  );
}
