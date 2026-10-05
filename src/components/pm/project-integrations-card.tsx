"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
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
  IntegrationRow,
  ProjectIntegrationsView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.integrations;

const stateColor: Record<string, string> = {
  untested: "default",
  passed: "success",
  failed: "error",
  waived: "warning",
};

interface Editing {
  row: IntegrationRow | null;
  name: string;
  targetSystem: string;
  direction: string;
  protocol: string;
  endpoint: string;
  description: string;
  contactId: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

const blank: Omit<Editing, "row"> = {
  name: "",
  targetSystem: "",
  direction: "both",
  protocol: "",
  endpoint: "",
  description: "",
  contactId: null,
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

/**
 * CD-219 — the customer's other systems the delivery connects to, who
 * answers for each on the customer's side, and its connection test.
 */
export function ProjectIntegrationsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectIntegrationsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/integrations`;

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
      name: editing.name,
      target_system: editing.targetSystem,
      direction: editing.direction,
      protocol: editing.protocol,
      endpoint: editing.endpoint,
      description: editing.description,
      contact_id: editing.contactId ?? "",
      contact_name: editing.contactName,
      contact_phone: editing.contactPhone,
      contact_email: editing.contactEmail,
    };
    const ok = editing.row
      ? await send(`${base}/${editing.row.id}`, "PUT", body)
      : await send(base, "POST", body);
    if (ok) setEditing(null);
  }

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        view.canWrite ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setEditing({ row: null, ...blank });
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
      {error && !editing && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}
      {view.integrations.length ? (
        <div className="divide-y">
          {view.integrations.map((row) => (
            <div key={row.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {row.label} · {row.name}
                  </span>{" "}
                  <Tag>{m.direction[row.direction] ?? row.direction}</Tag>
                  <span>{row.targetSystem}</span>
                  {row.protocol && <Tag className="ml-1">{row.protocol}</Tag>}
                </div>
                <Space size={0}>
                  {view.canWrite && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setEditing({
                          row,
                          name: row.name,
                          targetSystem: row.targetSystem,
                          direction: row.direction,
                          protocol: row.protocol ?? "",
                          endpoint: row.endpoint ?? "",
                          description: row.description ?? "",
                          contactId: row.contactId,
                          contactName: row.contactName ?? "",
                          contactPhone: row.contactPhone ?? "",
                          contactEmail: row.contactEmail ?? "",
                        });
                      }}
                    >
                      {m.edit}
                    </Button>
                  )}
                  {view.canWrite && row.mayRemove && (
                    <Popconfirm
                      title={m.removeConfirm}
                      onConfirm={() => void send(`${base}/${row.id}`, "DELETE")}
                    >
                      <Button size="small" type="link" danger>
                        {m.remove}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>
              {row.endpoint && (
                <div className="font-mono text-xs break-all">
                  {row.endpoint}
                </div>
              )}
              {row.description && (
                <div className="text-xs whitespace-pre-line">
                  {row.description}
                </div>
              )}
              <Text type="secondary" className="block text-xs">
                {m.owner}:{" "}
                {[row.contact.name, row.contact.phone, row.contact.email]
                  .filter(Boolean)
                  .join(" · ")}
                {row.contact.fromCrm && ` (${m.fromCrm})`}
              </Text>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {row.test && (
                  <Tag color={stateColor[row.test.state]}>
                    {row.test.label} {m.testState[row.test.state]}
                    {row.test.testedAt &&
                      ` · ${dayjs(row.test.testedAt).format("D MMM YY")}`}
                  </Tag>
                )}
                {row.test?.note && (
                  <Text type="secondary" className="text-xs">
                    {row.test.note}
                  </Text>
                )}
                <Text type="secondary" className="text-xs">
                  {row.configCount
                    ? m.configCount(row.configCount)
                    : m.noConfig}
                </Text>
              </div>
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
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.name}
              <Input
                value={editing.name}
                maxLength={200}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.targetSystem}
                <Input
                  value={editing.targetSystem}
                  maxLength={200}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      targetSystem: event.target.value,
                    })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.direction}
                <Select
                  className="w-full"
                  value={editing.direction}
                  options={Object.entries(m.direction).map(
                    ([value, label]) => ({ value, label }),
                  )}
                  onChange={(value: string) =>
                    setEditing({ ...editing, direction: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.protocol}
                <Input
                  value={editing.protocol}
                  maxLength={100}
                  placeholder="REST / SOAP / SFTP / DB link"
                  onChange={(event) =>
                    setEditing({ ...editing, protocol: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.endpoint}
                <Input
                  value={editing.endpoint}
                  maxLength={1000}
                  onChange={(event) =>
                    setEditing({ ...editing, endpoint: event.target.value })
                  }
                />
              </label>
            </div>
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
            <label className="block text-xs">
              {m.form.contact}
              <Select
                className="w-full"
                allowClear
                value={editing.contactId ?? undefined}
                options={view.contacts.map((row) => ({
                  value: row.id,
                  label: row.label,
                }))}
                onChange={(value?: string) =>
                  setEditing({ ...editing, contactId: value ?? null })
                }
              />
            </label>
            {!editing.contactId && (
              <>
                <Text type="secondary" className="block text-xs">
                  {m.form.orTyped}
                </Text>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input
                    placeholder={m.form.contactName}
                    value={editing.contactName}
                    maxLength={200}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        contactName: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder={m.form.contactPhone}
                    value={editing.contactPhone}
                    maxLength={50}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        contactPhone: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder={m.form.contactEmail}
                    value={editing.contactEmail}
                    maxLength={200}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        contactEmail: event.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
