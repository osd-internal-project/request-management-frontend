"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Input,
  Segmented,
  Space,
  Tag,
} from "antd";
import { CameraOutlined, PaperClipOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { TaskWorkView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.work;

const fileUrl = (projectId: string, taskId: string, fileId: string) =>
  `/api/app/projects/${projectId}/plan/tasks/${taskId}/files/${fileId}`;

/**
 * CD-181 — one task, for whoever does it: what and by when, a report form
 * that works on a phone (a note, a status move, a photo from the camera or
 * any file), and every report so far with its files.
 */
export function TaskWork({ view }: { readonly view: TaskWorkView }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { task, project } = view;
  const [note, setNote] = useState("");
  const [to, setTo] = useState<string>("keep");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const day = (value: string | null) =>
    value ? dayjs(value).format("D MMM YYYY") : "—";
  const fileOf = new Map(view.files.map((file) => [file.id, file]));

  function add(list: FileList | null) {
    if (list?.length) setFiles([...files, ...Array.from(list)]);
  }

  async function send() {
    if (!note.trim() && !files.length && to === "keep") {
      setError(m.required);
      return;
    }
    const form = new FormData();
    if (note.trim()) form.append("note", note);
    if (to !== "keep") form.append("status", to);
    for (const file of files) form.append("files", file);
    setBusy(true);
    setError(null);
    const result = await appApi(
      `projects/${project.id}/plan/tasks/${task.id}/reports`,
      { method: "POST", body: form },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.sent);
    setNote("");
    setTo("keep");
    setFiles([]);
    if (camera.current) camera.current.value = "";
    if (picker.current) picker.current.value = "";
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Space size={12} wrap className="text-sm">
        <Link href={ROUTES.myTasks}>← {m.backMine}</Link>
        <Link href={ROUTES.projectDetail(project.id)}>{m.back}</Link>
      </Space>
      <div>
        <Text type="secondary" className="block text-xs">
          {project.projectNo} · {project.name} · {task.wbs}
        </Text>
        <Title level={4} className="mb-1!">
          {task.title}
        </Title>
        <Space size={6} wrap>
          <Tag color={m.statusColor[task.status]}>{m.status[task.status]}</Tag>
          {task.milestone && <Tag color="blue">{task.milestone.title}</Tag>}
        </Space>
      </div>

      <Card size="small">
        <div className="space-y-1 text-sm">
          <div>
            {m.owner}: {task.ownerName ?? "—"}
          </div>
          {task.start && task.finish && (
            <div>{m.planned(day(task.start), day(task.finish))}</div>
          )}
          {task.startedAt && <div>{m.started(day(task.startedAt))}</div>}
          {task.doneAt && <div>{m.finished(day(task.doneAt))}</div>}
          {task.description && (
            <div className="whitespace-pre-line text-gray-600 dark:text-gray-300">
              {task.description}
            </div>
          )}
        </div>
      </Card>

      {task.summary ? (
        <Alert type="info" showIcon title={m.summary} />
      ) : (
        view.canReport && (
          <Card size="small" title={m.reportTitle}>
            <div className="space-y-3">
              {error && <Alert type="error" showIcon title={error} />}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                aria-label={m.note}
                placeholder={m.notePlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div>
                <Text type="secondary" className="block text-xs">
                  {m.moveTo}
                </Text>
                <Segmented
                  block
                  value={to}
                  onChange={(value) => setTo(String(value))}
                  options={[
                    { value: "keep", label: m.keep },
                    ...(["open", "in_progress", "done"] as const)
                      .filter((status) => status !== task.status)
                      .map((status) => ({
                        value: status,
                        label: m.status[status],
                      })),
                  ]}
                />
              </div>
              <Space wrap>
                <Button
                  icon={<CameraOutlined />}
                  onClick={() => camera.current?.click()}
                >
                  {m.photo}
                </Button>
                <Button
                  icon={<PaperClipOutlined />}
                  onClick={() => picker.current?.click()}
                >
                  {m.attach}
                </Button>
                {files.length > 0 && (
                  <Text type="secondary" className="text-xs">
                    {m.chosen(files.length)}
                  </Text>
                )}
              </Space>
              <input
                ref={camera}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => add(event.target.files)}
              />
              <input
                ref={picker}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(event) => add(event.target.files)}
              />
              <Button
                type="primary"
                block
                loading={busy}
                onClick={() => void send()}
              >
                {m.send}
              </Button>
            </div>
          </Card>
        )
      )}

      <Card size="small" title={m.history}>
        {view.updates.length ? (
          <div className="divide-y">
            {view.updates.map((update) => (
              <div key={update.id} className="py-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{update.authorName}</span>
                  <Text type="secondary" className="text-xs">
                    {dayjs(update.createdAt).format("D MMM YY HH:mm")}
                  </Text>
                </div>
                {update.statusTo && (
                  <Tag color={m.statusColor[update.statusTo]}>
                    {m.moved(
                      m.status[update.statusFrom ?? ""] ?? "",
                      m.status[update.statusTo] ?? "",
                    )}
                  </Tag>
                )}
                {update.note && (
                  <div className="whitespace-pre-line">{update.note}</div>
                )}
                {update.files.map((id) => {
                  const file = fileOf.get(id);
                  return file ? (
                    <a
                      key={id}
                      className="mr-3 inline-block text-xs"
                      href={fileUrl(project.id, task.id, id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <PaperClipOutlined /> {file.fileName}
                    </a>
                  ) : null;
                })}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={m.noHistory}
          />
        )}
      </Card>
    </div>
  );
}
