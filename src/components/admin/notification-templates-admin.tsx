"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, Card, Input, Popconfirm, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { adminApi } from "@/lib/api/client";
import {
  renderPreview,
  type NotificationTemplateRow,
} from "@/lib/api/notification-templates/types";
import { messages } from "@/lib/messages";

const m = messages.notificationTemplates;

/**
 * CD-54 — pick an event on the left, edit its wording on the right with a
 * preview filled from sample values. Saving replaces the standard wording for
 * this company only; "reset" puts the standard back.
 */
export function NotificationTemplatesAdmin({
  initial,
  companyName,
}: {
  readonly initial: NotificationTemplateRow[];
  readonly companyName: string;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState(initial[0]?.event_type ?? "");
  const row = rows.find((entry) => entry.event_type === selected);
  const current = row?.custom ?? row?.standard;
  const [title, setTitle] = useState(current?.title ?? "");
  const [body, setBody] = useState(current?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const samples = useMemo(
    () =>
      Object.fromEntries(
        (row?.variables ?? []).map((variable) => [
          variable.name,
          variable.sample,
        ]),
      ),
    [row],
  );

  function select(next: NotificationTemplateRow) {
    const wording = next.custom ?? next.standard;
    setSelected(next.event_type);
    setTitle(wording.title);
    setBody(wording.body);
    setError(null);
  }

  function replace(updated: NotificationTemplateRow) {
    setRows((list) =>
      list.map((entry) =>
        entry.event_type === updated.event_type ? updated : entry,
      ),
    );
    select(updated);
  }

  async function save() {
    if (!row) return;
    setBusy(true);
    setError(null);
    const result = await adminApi<NotificationTemplateRow>(
      `notification-templates/${encodeURIComponent(row.event_type)}`,
      { method: "PUT", body: JSON.stringify({ title, body }) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    replace(result.data);
    message.success(m.saved);
  }

  async function reset() {
    if (!row) return;
    setBusy(true);
    setError(null);
    const result = await adminApi<NotificationTemplateRow>(
      `notification-templates/${encodeURIComponent(row.event_type)}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    replace(result.data);
    message.success(m.resetDone);
  }

  const dirty = !!current && (title !== current.title || body !== current.body);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card size="small" className="self-start">
        <div className="space-y-1">
          {rows.map((entry) => (
            <button
              key={entry.event_type}
              type="button"
              onClick={() => select(entry)}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                entry.event_type === selected
                  ? "bg-blue-50 font-medium"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className="block">{entry.label}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {entry.event_type}
                {entry.custom && (
                  <Tag color="blue" className="mr-0! text-xs">
                    {m.customTag}
                  </Tag>
                )}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {row && (
        <Card
          size="small"
          title={row.label}
          extra={
            row.custom ? (
              <Text type="secondary" className="text-xs">
                {m.customSince(new Date(row.custom.updated_at))}
              </Text>
            ) : (
              <Text type="secondary" className="text-xs">
                {m.usingStandard}
              </Text>
            )
          }
        >
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block">
              <Text strong>{m.titleLabel}</Text>
              <Input
                className="mt-1"
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="block">
              <Text strong>{m.bodyLabel}</Text>
              <Input.TextArea
                className="mt-1"
                rows={4}
                maxLength={2000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>

            <div>
              <Text type="secondary" className="block text-xs">
                {m.variablesHint}
              </Text>
              <div className="mt-1 flex flex-wrap gap-1">
                {row.variables.map((variable) => (
                  <Tag
                    key={variable.name}
                    className="cursor-pointer"
                    onClick={() =>
                      setBody((text) => `${text}{{${variable.name}}}`)
                    }
                  >
                    {`{{${variable.name}}}`} · {variable.label}
                  </Tag>
                ))}
              </div>
            </div>

            <div className="rounded border border-dashed p-3">
              <Text type="secondary" className="block text-xs">
                {m.preview}
              </Text>
              <Text strong className="block">
                {renderPreview(title, samples)}
              </Text>
              <Text className="block text-sm whitespace-pre-line">
                {renderPreview(body, samples)}
              </Text>
              <Text type="secondary" className="mt-2 block text-xs">
                {m.emailSignature(companyName)}
              </Text>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {row.custom && (
                <Popconfirm
                  title={m.resetConfirm}
                  onConfirm={() => void reset()}
                >
                  <Button disabled={busy}>{m.reset}</Button>
                </Popconfirm>
              )}
              {dirty && (
                <Button disabled={busy} onClick={() => select(row)}>
                  {m.discard}
                </Button>
              )}
              <Button
                type="primary"
                loading={busy}
                disabled={!dirty}
                onClick={() => void save()}
              >
                {m.save}
              </Button>
            </div>

            <Text type="secondary" className="block text-xs">
              {m.standardIs(row.standard.title)}
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
