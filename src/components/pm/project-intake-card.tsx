"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  IntakeGroup,
  IntakeLineView,
  ProjectIntakeView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.intake;

const GROUPS: IntakeGroup[] = ["sales", "technical", "contract", "company"];

const when = (at: string) => dayjs(at).format("D MMM YYYY HH:mm");

/**
 * CD-176 — the manager receives the work from Sales and the technical team:
 * each line marked correct or incomplete with a reason; all correct →
 * received; incomplete lines sent back to the side that answers for them.
 */
export function ProjectIntakeCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectIntakeView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gap, setGap] = useState<{ line: IntakeLineView; note: string } | null>(
    null,
  );
  const [sendBack, setSendBack] = useState<string | null>(null);
  const base = `projects/${projectId}/intake`;

  if (!view.status) return null;

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, {
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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

  const incomplete = view.lines.filter((line) => line.result === "incomplete");
  const accepted = view.status === "accepted";

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          <Tag color={m.statusColor[view.status]}>{m.status[view.status]}</Tag>
          {(view.round ?? 0) > 0 && (
            <Text type="secondary" className="text-xs">
              {m.round(view.round ?? 0)}
            </Text>
          )}
        </Space>
      }
      extra={
        view.canEdit ? (
          <Space wrap>
            <Tooltip title={m.refreshHint}>
              <Button
                size="small"
                loading={busy}
                onClick={() => void call(`${base}/refresh`)}
              >
                {m.refresh}
              </Button>
            </Tooltip>
            <Button
              size="small"
              danger
              disabled={busy || !incomplete.length}
              onClick={() => {
                setError(null);
                setSendBack("");
              }}
            >
              {m.returnWork}
            </Button>
            <Popconfirm
              title={m.acceptConfirm}
              onConfirm={() => void call(`${base}/accept`)}
              disabled={Boolean(view.problems?.length)}
            >
              <Button
                size="small"
                type="primary"
                disabled={busy || Boolean(view.problems?.length)}
              >
                {m.accept}
              </Button>
            </Popconfirm>
          </Space>
        ) : undefined
      }
    >
      {!accepted && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.hint}
        </Text>
      )}
      {accepted && view.acceptedAt && (
        <Alert
          className="mb-2"
          type="success"
          showIcon
          title={m.accepted(view.acceptedByName ?? "—", when(view.acceptedAt))}
        />
      )}
      {view.status === "returned" && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={m.bannerReturned}
        />
      )}
      {error && !gap && sendBack === null && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {GROUPS.map((group) => {
        const lines = view.lines.filter((line) => line.group === group);
        if (!lines.length) return null;
        return (
          <div key={group} className="mb-2">
            <Text strong className="text-xs">
              {m.groups[group]}
            </Text>
            <div className="divide-y">
              {lines.map((line) => (
                <div
                  key={line.code}
                  className="flex flex-wrap items-start justify-between gap-2 py-1.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <Tag color={m.resultColor[line.result ?? "none"]}>
                      {m.result[line.result ?? "none"]}
                    </Tag>
                    <span className="font-medium">{line.label}</span>
                    {line.warn && (
                      <Tooltip title={m.warn}>
                        <WarningOutlined className="ml-1 text-amber-500" />
                      </Tooltip>
                    )}
                    {line.detail && (
                      <div className="text-xs text-gray-500">{line.detail}</div>
                    )}
                    {line.changed && (
                      <Text type="warning" className="block text-xs">
                        {m.changed}
                      </Text>
                    )}
                    {line.result === "incomplete" && line.note && (
                      <Text type="danger" className="block text-xs">
                        {line.note}
                      </Text>
                    )}
                    {line.byName && line.at && (
                      <Text type="secondary" className="block text-xs">
                        {m.checkedBy(line.byName, when(line.at))}
                      </Text>
                    )}
                  </div>
                  {view.canEdit && (
                    <Space size={0}>
                      <Button
                        size="small"
                        type="link"
                        disabled={busy || line.result === "ok"}
                        onClick={() =>
                          void call(`${base}/answer`, {
                            code: line.code,
                            result: "ok",
                          })
                        }
                      >
                        {m.ok}
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        danger
                        disabled={busy}
                        onClick={() => {
                          setError(null);
                          setGap({ line, note: line.note ?? "" });
                        }}
                      >
                        {m.incomplete}
                      </Button>
                    </Space>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {view.history.length > 0 && (
        <Collapse
          size="small"
          ghost
          items={[
            {
              key: "history",
              label: m.history,
              children: (
                <div className="space-y-1 text-xs">
                  {view.history.map((row) => (
                    <div key={`${row.at}${row.action}`}>
                      <Text strong>{m.historyAction[row.action]}</Text>{" "}
                      {row.byName} · {when(row.at)}
                      {row.lines.length > 0 && (
                        <Text type="secondary"> — {row.lines.join(" · ")}</Text>
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={gap !== null}
        title={gap ? m.incompleteTitle(gap.line.label) : undefined}
        okText={m.incomplete}
        cancelText={m.cancel}
        okButtonProps={{ danger: true, disabled: !gap?.note.trim() }}
        confirmLoading={busy}
        onCancel={() => setGap(null)}
        onOk={async () => {
          if (!gap) return;
          const done = await call(`${base}/answer`, {
            code: gap.line.code,
            result: "incomplete",
            note: gap.note.trim(),
          });
          if (done) setGap(null);
        }}
        destroyOnHidden
      >
        {error && gap && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        <Text className="mb-1 block text-xs">{m.incompleteNote}</Text>
        <Input.TextArea
          autoSize={{ minRows: 3 }}
          maxLength={1000}
          value={gap?.note ?? ""}
          onChange={(event) =>
            setGap((current) =>
              current ? { ...current, note: event.target.value } : current,
            )
          }
        />
      </Modal>

      <Modal
        open={sendBack !== null}
        title={m.returnTitle}
        okText={m.returnWork}
        cancelText={m.cancel}
        okButtonProps={{ danger: true }}
        confirmLoading={busy}
        onCancel={() => setSendBack(null)}
        onOk={async () => {
          const done = await call(`${base}/return`, {
            note: sendBack?.trim() || undefined,
          });
          if (done) setSendBack(null);
        }}
        destroyOnHidden
      >
        {error && sendBack !== null && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        <Text strong className="block text-xs">
          {m.returnGaps}
        </Text>
        <ul className="mb-2 list-disc pl-5 text-sm">
          {incomplete.map((line) => (
            <li key={line.code}>
              <Text type="secondary">{m.groups[line.group]}:</Text> {line.label}
              {line.note ? ` — ${line.note}` : ""}
            </li>
          ))}
        </ul>
        <Text className="mb-1 block text-xs">{m.returnNote}</Text>
        <Input.TextArea
          autoSize={{ minRows: 2 }}
          maxLength={1000}
          value={sendBack ?? ""}
          onChange={(event) => setSendBack(event.target.value)}
        />
      </Modal>
    </Card>
  );
}
