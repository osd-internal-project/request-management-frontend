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
  /** CD-254 — the phase's installation confirmed complete. */
  installed: { confirmedAt: string; confirmedBy: string; note: string } | null;
  workTypes: string[];
  complete: boolean;
  missing: string[];
  required: { title: string; documents: Doc[] }[];
  extras: Doc[];
}

interface View {
  canAttach: boolean;
  canConfirmInstall: boolean;
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
  // CD-254 — confirm (with what still blocks it) or take back
  const [installing, setInstalling] = useState<{
    phase: Phase;
    mode: "confirm" | "revoke";
    text: string;
    blockers: string[] | null;
  } | null>(null);
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

  const openConfirm = async (phase: Phase) => {
    setInstalling({ phase, mode: "confirm", text: "", blockers: null });
    const result = await appApi<{ blockers: string[] }>(
      `delivery/projects/${projectId}/install-gate`,
    );
    setInstalling((current) =>
      current && current.phase.milestone.id === phase.milestone.id
        ? { ...current, blockers: result.ok ? result.data.blockers : [] }
        : current,
    );
  };

  const submitInstall = async () => {
    if (!installing) return;
    const path = `delivery/projects/${projectId}/phases/${installing.phase.milestone.id}/install`;
    setBusy(true);
    const result = await appApi<unknown>(
      installing.mode === "confirm" ? path : `${path}/revoke`,
      {
        method: "POST",
        body: JSON.stringify(
          installing.mode === "confirm"
            ? { note: installing.text.trim() }
            : { reason: installing.text.trim() },
        ),
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(
      installing.mode === "confirm" ? m.installConfirmed : m.installRevoked,
    );
    setInstalling(null);
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
                {phase.installed ? (
                  <Tag color="success" icon={<CheckCircleFilled />}>
                    {m.installedOn.replace(
                      "{d}",
                      new Date(phase.installed.confirmedAt).toLocaleDateString(
                        "th-TH",
                      ),
                    )}
                  </Tag>
                ) : (
                  <Tag>{m.notInstalled}</Tag>
                )}
                {view.canConfirmInstall &&
                phase.milestone.status !== "achieved" ? (
                  phase.installed ? (
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() =>
                        setInstalling({
                          phase,
                          mode: "revoke",
                          text: "",
                          blockers: [],
                        })
                      }
                    >
                      {m.revokeInstall}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => void openConfirm(phase)}
                    >
                      {m.confirmInstall}
                    </Button>
                  )
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
        open={!!installing}
        title={
          installing
            ? `${installing.mode === "confirm" ? m.confirmInstall : m.revokeInstall} — ${installing.phase.milestone.seq}. ${installing.phase.milestone.title}`
            : ""
        }
        okText={
          installing?.mode === "confirm" ? m.confirmInstall : m.revokeInstall
        }
        okButtonProps={{
          loading: busy,
          danger: installing?.mode === "revoke",
          disabled:
            !installing ||
            (installing.mode === "confirm"
              ? installing.blockers === null || installing.blockers.length > 0
              : !installing.text.trim()),
        }}
        onOk={() => void submitInstall()}
        onCancel={() => setInstalling(null)}
        destroyOnHidden
      >
        {installing ? (
          <div className="space-y-2">
            {installing.mode === "confirm" ? (
              installing.blockers === null ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : installing.blockers.length ? (
                <Alert
                  type="warning"
                  showIcon
                  title={m.installBlocked}
                  description={
                    <ul className="m-0 pl-4">
                      {installing.blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  }
                />
              ) : (
                <Alert type="success" showIcon title={m.installReady} />
              )
            ) : null}
            <Input.TextArea
              rows={2}
              maxLength={1000}
              placeholder={
                installing.mode === "confirm" ? m.note : m.revokeReason
              }
              value={installing.text}
              onChange={(event) =>
                setInstalling({ ...installing, text: event.target.value })
              }
            />
          </div>
        ) : null}
      </Modal>
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
