"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleTwoTone,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { LessonView, ProjectCloseoutView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.closeout;

interface LessonDraft {
  id?: string;
  kind: LessonView["kind"];
  text: string;
}

/**
 * CD-191 — closing the project: the checklist (what is owed stops it; the
 * rest only warns), the documents it must leave behind, its lessons
 * learned, and the request to the project's executives.
 */
export function ProjectCloseoutCard({
  projectId,
  view,
  currentUserId,
}: {
  readonly projectId: string;
  readonly view: ProjectCloseoutView;
  readonly currentUserId: string | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [lesson, setLesson] = useState<LessonDraft | null>(null);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState(view.closeout?.summary ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/closeout`;
  const status = view.closeout?.status ?? null;
  const closed = view.projectStatus === "closed";

  async function call(path: string, init: RequestInit, done: string) {
    setBusy(true);
    setError(null);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(done);
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
    const ok = await call(
      `${base}/documents`,
      { method: "POST", body: form },
      m.saved,
    );
    if (ok) setAttaching(null);
  }

  async function saveLesson() {
    if (!lesson) return;
    const ok = await call(
      lesson.id ? `${base}/lessons/${lesson.id}` : `${base}/lessons`,
      {
        method: lesson.id ? "PATCH" : "POST",
        body: JSON.stringify({ kind: lesson.kind, text: lesson.text }),
      },
      m.saved,
    );
    if (ok) setLesson(null);
  }

  const openAttach = (title: string) => {
    setError(null);
    setFile(null);
    setNote("");
    setAttaching(title);
  };
  const extra = view.documents.filter(
    (doc) => !view.required.some((row) => row.documentIds.includes(doc.id)),
  );
  const fileHref = (id: string) =>
    `/api/app/projects/${projectId}/closeout/documents/${id}/file`;

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          {status && (
            <Tag color={m.statusColor[status]}>{m.status[status]}</Tag>
          )}
          {closed && <Tag color="success">{m.closed}</Tag>}
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && !lesson && attaching === null && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}
      {view.closeout?.error && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={view.closeout.error}
        />
      )}
      {view.closeout?.requestId && (
        <Text className="mb-2 block text-xs">
          <a href={ROUTES.requestDetail(view.closeout.requestId)}>
            {m.request(view.closeout.requestNo ?? "")}
          </a>
          {view.closeout.submittedAt &&
            ` · ${m.submitted(
              dayjs(view.closeout.submittedAt).format("D MMM YY"),
              view.closeout.submittedByName ?? "",
            )}`}
        </Text>
      )}

      {/* the checklist */}
      <div className="mb-3 space-y-1">
        {view.checks.map((check) => (
          <div key={check.key} className="flex items-start gap-2 text-sm">
            {check.ok ? (
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            ) : check.blocking ? (
              <CloseCircleTwoTone twoToneColor="#ff4d4f" />
            ) : (
              <ExclamationCircleTwoTone twoToneColor="#faad14" />
            )}
            <span>
              {check.label}
              {check.detail && (
                <Text
                  type={check.blocking ? "danger" : "warning"}
                  className="ml-1 text-xs"
                >
                  ({check.detail})
                </Text>
              )}
              {!check.ok && !check.blocking && (
                <Text type="secondary" className="ml-1 text-xs">
                  {m.warnOnly}
                </Text>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* documents */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <Text strong className="text-sm">
            {m.documents}
          </Text>
          {view.canEdit && (
            <Button size="small" type="link" onClick={() => openAttach("")}>
              {m.attachOther}
            </Button>
          )}
        </div>
        {view.required.map((row) => {
          const docs = view.documents.filter((doc) =>
            row.documentIds.includes(doc.id),
          );
          return (
            <div key={row.title} className="py-1 text-sm">
              <span className="font-medium">{row.title}</span>{" "}
              {docs.length ? (
                <Tag color="success">{m.attached}</Tag>
              ) : (
                <Tag color="red">{m.missing}</Tag>
              )}
              {view.canEdit && (
                <Button
                  size="small"
                  type="link"
                  onClick={() => openAttach(row.title)}
                >
                  {m.attach}
                </Button>
              )}
              {docs.map((doc) => (
                <DocumentLine
                  key={doc.id}
                  href={fileHref(doc.id)}
                  name={doc.fileName}
                  by={doc.uploadedByName}
                  at={doc.uploadedAt}
                  canRemove={view.canEdit}
                  onRemove={() =>
                    void call(
                      `${base}/documents/${doc.id}`,
                      { method: "DELETE" },
                      m.removed,
                    )
                  }
                />
              ))}
            </div>
          );
        })}
        {extra.map((doc) => (
          <div key={doc.id} className="py-1 text-sm">
            <span className="font-medium">{doc.title}</span>
            <DocumentLine
              href={fileHref(doc.id)}
              name={doc.fileName}
              by={doc.uploadedByName}
              at={doc.uploadedAt}
              canRemove={view.canEdit}
              onRemove={() =>
                void call(
                  `${base}/documents/${doc.id}`,
                  { method: "DELETE" },
                  m.removed,
                )
              }
            />
          </div>
        ))}
      </div>

      {/* lessons */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <Text strong className="text-sm">
            {m.lessons} · {view.lessons.length}
          </Text>
          {view.canWrite && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setError(null);
                setLesson({ kind: "went_well", text: "" });
              }}
            >
              {m.addLesson}
            </Button>
          )}
        </div>
        <Text type="secondary" className="mb-1 block text-xs">
          {m.kbmsHint}
        </Text>
        {view.lessons.length === 0 && (
          <Text type="secondary" className="block text-xs">
            {m.noLessons}
          </Text>
        )}
        {view.lessons.map((row) => {
          const mine = view.canEdit || row.createdBy === currentUserId;
          return (
            <div key={row.id} className="py-1 text-sm">
              <Tag color={m.kindColor[row.kind]}>{m.kind[row.kind]}</Tag>
              <span className="whitespace-pre-line">{row.text}</span>
              <Text type="secondary" className="ml-1 text-xs">
                {row.createdByName ?? ""} ·{" "}
                {row.kbmsStatus === "sent" ? m.kbmsSent : m.kbmsPending}
              </Text>
              {view.canWrite && mine && (
                <Space size={0}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setError(null);
                      setLesson({ id: row.id, kind: row.kind, text: row.text });
                    }}
                  >
                    {m.edit}
                  </Button>
                  <Popconfirm
                    title={m.removeLesson}
                    onConfirm={() =>
                      void call(
                        `${base}/lessons/${row.id}`,
                        { method: "DELETE" },
                        m.removed,
                      )
                    }
                  >
                    <Button size="small" type="link" danger>
                      {m.remove}
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </div>
          );
        })}
      </div>

      {/* asking to close */}
      {view.canEdit && (
        <div className="space-y-2">
          <label className="block text-xs">
            {m.summary}
            <Input.TextArea
              rows={3}
              maxLength={4000}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
          {!view.typeConfigured && (
            <Alert type="info" showIcon title={m.notConfigured} />
          )}
          <Space wrap>
            <Button
              size="small"
              loading={busy}
              onClick={() =>
                void call(
                  base,
                  { method: "PUT", body: JSON.stringify({ summary }) },
                  m.saved,
                )
              }
            >
              {m.saveSummary}
            </Button>
            <Popconfirm
              title={m.submitConfirm}
              disabled={view.problems.length > 0 || !view.typeConfigured}
              onConfirm={async () => {
                // the summary as typed goes with the request
                const saved = await appApi(base, {
                  method: "PUT",
                  body: JSON.stringify({ summary }),
                });
                if (!saved.ok) {
                  setError(saved.message);
                  return;
                }
                await call(`${base}/submit`, { method: "POST" }, m.submittedOk);
              }}
            >
              <Button
                size="small"
                type="primary"
                loading={busy}
                disabled={view.problems.length > 0 || !view.typeConfigured}
              >
                {status === "rejected" ? m.resubmit : m.submit}
              </Button>
            </Popconfirm>
            {view.problems.length > 0 && (
              <Text type="danger" className="text-xs">
                {m.blocked(view.problems.length)}
              </Text>
            )}
          </Space>
        </div>
      )}
      {!view.canEdit && view.closeout?.summary && (
        <div className="text-xs whitespace-pre-line">
          {m.summary}: {view.closeout.summary}
        </div>
      )}

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
        open={lesson !== null}
        title={lesson?.id ? m.form.editLesson : m.form.addLesson}
        onCancel={() => setLesson(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void saveLesson()}
        destroyOnHidden
      >
        {lesson && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.kind}
              <Select
                className="w-full"
                value={lesson.kind}
                onChange={(kind: LessonDraft["kind"]) =>
                  setLesson({ ...lesson, kind })
                }
                options={Object.entries(m.kind).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>
            <label className="block text-xs">
              {m.form.text}
              <Input.TextArea
                rows={4}
                maxLength={4000}
                value={lesson.text}
                onChange={(event) =>
                  setLesson({ ...lesson, text: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function DocumentLine({
  href,
  name,
  by,
  at,
  canRemove,
  onRemove,
}: {
  readonly href: string;
  readonly name: string;
  readonly by: string | null;
  readonly at: string;
  readonly canRemove: boolean;
  readonly onRemove: () => void;
}) {
  return (
    <div className="pl-3 text-xs">
      <a href={href} target="_blank" rel="noreferrer">
        {name}
      </a>
      <Text type="secondary" className="ml-1 text-xs">
        {by ?? ""} · {dayjs(at).format("D MMM YY")}
      </Text>
      {canRemove && (
        <Popconfirm title={m.removeDocument} onConfirm={onRemove}>
          <Button size="small" type="link" danger>
            {m.remove}
          </Button>
        </Popconfirm>
      )}
    </div>
  );
}
