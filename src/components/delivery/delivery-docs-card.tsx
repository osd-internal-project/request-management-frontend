"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Upload,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  PaperClipOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.delivery.docs;

interface Doc {
  id: string;
  title: string;
  note: string | null;
  fileName: string;
  uploadedAt: string;
  canRemove: boolean;
}

interface Phase {
  milestone: { id: string; seq: number; title: string; status: string };
  next: boolean;
  workTypes: string[];
  complete: boolean;
  missing: string[];
  required: { title: string; documents: Doc[] }[];
  extras: Doc[];
}

interface View {
  canAttach: boolean;
  phases: Phase[];
  next: string | null;
}

interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string | null;
}

/** Kept by Engineer and shown beside the pack, not attached twice. */
const ELSEWHERE = ["tests", "as_built", "software_docs"];

/**
 * CD-251 — each phase's delivery documents: what its work types require,
 * what is attached, what is missing; the next phase's gaps stop the
 * acceptance booking (through the readiness check).
 */
export function DeliveryDocsCard({ projectId }: { projectId: string }) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    version: number;
    view: View | null;
    error: string | null;
  } | null>(null);
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);
  const [attaching, setAttaching] = useState<{
    milestoneId: string;
    title: string;
    fixed: boolean;
    note: string;
    file: File | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `delivery/projects/${projectId}/documents`;

  useEffect(() => {
    let live = true;
    void appApi<View>(base).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { version, view: result.data, error: null }
          : { version, view: null, error: result.message },
      );
    });
    void appApi<{ checks: ReadinessCheck[] }>(
      `projects/${projectId}/readiness`,
    ).then((result) => {
      if (live && result.ok) setChecks(result.data.checks ?? []);
    });
    return () => {
      live = false;
    };
  }, [base, projectId, version]);

  const view = loaded?.view ?? null;
  const reload = () => setVersion((value) => value + 1);

  const attach = async () => {
    if (!attaching?.file) return;
    const form = new FormData();
    form.append("milestone_id", attaching.milestoneId);
    form.append("title", attaching.title);
    if (attaching.note.trim()) form.append("note", attaching.note);
    form.append("file", attaching.file);
    setBusy(true);
    const result = await appApi<View>(base, { method: "POST", body: form });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.attached);
    setAttaching(null);
    reload();
  };

  const remove = async (id: string) => {
    const result = await appApi<View>(`${base}/${id}`, { method: "DELETE" });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    reload();
  };

  const docLink = (doc: Doc) => (
    <Space key={doc.id} size={4}>
      <PaperClipOutlined />
      <a
        href={`/api/app/${base}/${doc.id}/file`}
        target="_blank"
        rel="noreferrer"
      >
        {doc.fileName}
      </a>
      {doc.canRemove ? (
        <Popconfirm
          title={m.removeConfirm}
          onConfirm={() => void remove(doc.id)}
        >
          <Button type="link" size="small" danger>
            {m.remove}
          </Button>
        </Popconfirm>
      ) : null}
    </Space>
  );

  const elsewhere = checks.filter((c) => ELSEWHERE.includes(c.key));

  return (
    <Card size="small" title={m.title}>
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !view ? (
        <Skeleton active />
      ) : (
        <div className="space-y-4">
          {elsewhere.length ? (
            <div>
              <Text type="secondary" className="mb-1 block text-xs">
                {m.elsewhere}
              </Text>
              <Space wrap>
                {elsewhere.map((c) => (
                  <Tag
                    key={c.key}
                    color={c.ok ? "success" : "warning"}
                    icon={c.ok ? <CheckCircleFilled /> : <CloseCircleFilled />}
                  >
                    {c.label}
                    {c.detail ? ` — ${c.detail}` : ""}
                  </Tag>
                ))}
              </Space>
            </div>
          ) : null}
          {!view.phases.length ? (
            <Text type="secondary">{m.noPhase}</Text>
          ) : null}
          {view.phases.map((phase) => (
            <div
              key={phase.milestone.id}
              className="rounded-md border border-solid border-black/10 p-3 dark:border-white/15"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Text strong>
                  {phase.milestone.seq}. {phase.milestone.title}
                </Text>
                {phase.workTypes.map((type) => (
                  <Tag key={type}>{m.workTypes[type] ?? type}</Tag>
                ))}
                <Tag color={phase.complete ? "success" : "error"}>
                  {phase.complete
                    ? m.complete
                    : m.missingCount.replace(
                        "{n}",
                        String(phase.missing.length),
                      )}
                </Tag>
                {phase.next ? (
                  <Tag color="processing">{m.nextPhase}</Tag>
                ) : null}
              </div>
              <div className="space-y-1">
                {phase.required.map((row) => (
                  <div
                    key={row.title}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {row.documents.length ? (
                      <CheckCircleFilled className="text-green-600" />
                    ) : (
                      <CloseCircleFilled className="text-red-500" />
                    )}
                    <Text>{row.title}</Text>
                    {row.documents.map(docLink)}
                    {view.canAttach ? (
                      <Button
                        size="small"
                        icon={<UploadOutlined />}
                        onClick={() =>
                          setAttaching({
                            milestoneId: phase.milestone.id,
                            title: row.title,
                            fixed: true,
                            note: "",
                            file: null,
                          })
                        }
                      >
                        {m.attach}
                      </Button>
                    ) : null}
                  </div>
                ))}
                {!phase.required.length ? (
                  <Text type="secondary" className="text-xs">
                    {m.noneRequired}
                  </Text>
                ) : null}
              </div>
              {phase.extras.length ? (
                <div className="mt-2">
                  <Text type="secondary" className="text-xs">
                    {m.extras}
                  </Text>
                  <div className="flex flex-col gap-1">
                    {phase.extras.map((doc) => (
                      <Space key={doc.id} size={4} wrap>
                        <Text className="text-xs">{doc.title}:</Text>
                        {docLink(doc)}
                      </Space>
                    ))}
                  </div>
                </div>
              ) : null}
              {view.canAttach ? (
                <Button
                  type="dashed"
                  size="small"
                  className="mt-2"
                  onClick={() =>
                    setAttaching({
                      milestoneId: phase.milestone.id,
                      title: "",
                      fixed: false,
                      note: "",
                      file: null,
                    })
                  }
                >
                  {m.attachOther}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!attaching}
        title={m.attachTitle}
        okText={m.attach}
        okButtonProps={{
          loading: busy,
          disabled: !attaching?.file || !attaching.title.trim(),
        }}
        onOk={() => void attach()}
        onCancel={() => setAttaching(null)}
        destroyOnHidden
      >
        {attaching ? (
          <div className="space-y-2">
            {attaching.fixed ? (
              <Text strong>{attaching.title}</Text>
            ) : (
              <AutoComplete
                className="w-full"
                placeholder={m.docTitle}
                value={attaching.title}
                onChange={(title: string) =>
                  setAttaching({ ...attaching, title })
                }
                options={(
                  view?.phases.find(
                    (p) => p.milestone.id === attaching.milestoneId,
                  )?.missing ?? []
                ).map((title) => ({ value: title }))}
              />
            )}
            <Input
              placeholder={m.note}
              maxLength={1000}
              value={attaching.note}
              onChange={(event) =>
                setAttaching({ ...attaching, note: event.target.value })
              }
            />
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                setAttaching({ ...attaching, file });
                return false;
              }}
              onRemove={() => setAttaching({ ...attaching, file: null })}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            >
              <Button icon={<UploadOutlined />}>{m.pickFile}</Button>
            </Upload>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
