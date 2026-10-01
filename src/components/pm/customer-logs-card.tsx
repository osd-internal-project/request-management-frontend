"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
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
import type { CustomerLogView, CustomerLogsView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.customerLogs;

interface Draft {
  id?: string;
  kind: CustomerLogView["kind"];
  occurredOn: Dayjs | null;
  contactName: string;
  summary: string;
  decision: string;
  affectsScope: boolean;
}

/**
 * CD-186 — what passed with the customer and what they decided; a decision
 * on the scope stays flagged until it becomes a change request.
 */
export function CustomerLogsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: CustomerLogsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/customer-logs`;

  async function call<T>(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const result = await appApi<T>(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    router.refresh();
    return result.data;
  }

  async function save() {
    if (!draft) return;
    const done = await call(draft.id ? `${base}/${draft.id}` : base, {
      method: draft.id ? "PATCH" : "POST",
      body: JSON.stringify({
        kind: draft.kind,
        occurred_on: draft.occurredOn?.format("YYYY-MM-DD"),
        contact_name: draft.contactName,
        summary: draft.summary,
        decision: draft.decision,
        affects_scope: draft.affectsScope,
      }),
    });
    if (done) {
      message.success(m.saved);
      setDraft(null);
    }
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.logs.length}`}
      extra={
        view.canWrite ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setDraft({
                kind: "meeting",
                occurredOn: dayjs(),
                contactName: "",
                summary: "",
                decision: "",
                affectsScope: false,
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
      {view.owesChange > 0 && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={m.owes(view.owesChange)}
        />
      )}
      {error && !draft && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.logs.length ? (
        <div className="divide-y">
          {view.logs.map((log) => (
            <div key={log.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {log.label} · {dayjs(log.occurredOn).format("D MMM YY")}
                  </span>{" "}
                  <Tag>{m.kind[log.kind]}</Tag>
                  {log.contactName && (
                    <Text type="secondary" className="text-xs">
                      {log.contactName}
                    </Text>
                  )}
                  {log.owesChange && <Tag color="red">{m.mustConvert}</Tag>}
                  {log.changeRequest && (
                    <Tag color="purple">
                      {m.becameChange(log.changeRequest.label)}
                    </Tag>
                  )}
                </div>
                <Space size={0} wrap>
                  {view.canWrite && !log.changeRequest && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setDraft({
                          id: log.id,
                          kind: log.kind,
                          occurredOn: dayjs(log.occurredOn),
                          contactName: log.contactName ?? "",
                          summary: log.summary,
                          decision: log.decision ?? "",
                          affectsScope: log.affectsScope,
                        });
                      }}
                    >
                      {m.edit}
                    </Button>
                  )}
                  {view.canConvert && log.owesChange && (
                    <Popconfirm
                      title={m.toChange}
                      onConfirm={async () => {
                        const done = await call<{ logs: CustomerLogView[] }>(
                          `${base}/${log.id}/change`,
                          { method: "POST" },
                        );
                        const label = done?.logs.find(
                          (row) => row.id === log.id,
                        )?.changeRequest?.label;
                        if (label) message.success(m.toChangeDone(label));
                      }}
                    >
                      <Button size="small" type="link">
                        {m.toChange}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>
              <div className="whitespace-pre-line text-xs">{log.summary}</div>
              {log.decision && (
                <div className="text-xs font-medium">
                  {m.decision(log.decision)}{" "}
                  {log.affectsScope && (
                    <Tag color="orange">{m.affectsScope}</Tag>
                  )}
                </div>
              )}
              {log.createdByName && (
                <Text type="secondary" className="block text-xs">
                  {m.by(log.createdByName)}
                </Text>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? m.form.editTitle : m.form.addTitle}
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                {m.form.kind}
                <Select
                  className="w-full"
                  value={draft.kind}
                  onChange={(kind: Draft["kind"]) =>
                    setDraft({ ...draft, kind })
                  }
                  options={Object.entries(m.kind).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
              <label className="block text-xs">
                {m.form.on}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.occurredOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    setDraft({ ...draft, occurredOn: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.contact}
                <Input
                  value={draft.contactName}
                  maxLength={255}
                  onChange={(event) =>
                    setDraft({ ...draft, contactName: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.summary}
              <Input.TextArea
                rows={3}
                value={draft.summary}
                onChange={(event) =>
                  setDraft({ ...draft, summary: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.decision}
              <Input.TextArea
                rows={2}
                value={draft.decision}
                onChange={(event) =>
                  setDraft({ ...draft, decision: event.target.value })
                }
              />
            </label>
            <Checkbox
              checked={draft.affectsScope}
              onChange={(event) =>
                setDraft({ ...draft, affectsScope: event.target.checked })
              }
            >
              {m.form.affectsScope}
            </Checkbox>
          </div>
        )}
      </Modal>
    </Card>
  );
}
