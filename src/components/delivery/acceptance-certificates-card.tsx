"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Upload,
} from "antd";
import { FilePdfOutlined, UploadOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.delivery.certificates;
const e = messages.esign.contract;

interface Certificate {
  id: string;
  certificateNo: string;
  status: "draft" | "sent" | "signed" | "cancelled";
  source: "esign" | "paper";
  envelopeId: string | null;
  signedName: string | null;
  signedAt: string | null;
  paperReason: string | null;
}

interface Round {
  acceptanceId: string;
  label: string;
  phase: string | null;
  result: "accepted" | "conditional";
  decidedOn: string | null;
  uploadedCertificate: string | null;
  certificate: Certificate | null;
}

interface View {
  canManage: boolean;
  people: { id: string; name: string }[];
  layouts: {
    id: string;
    name: string;
    fields: { key: string; label: string }[];
  }[];
  rounds: Round[];
}

interface SignerDraft {
  kind: "internal" | "external";
  userId?: string;
  name: string;
  email: string;
  phone: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  sent: "processing",
  signed: "success",
  cancelled: "default",
};

/**
 * CD-252 — each accepted round's certificate: drawn up from the result,
 * sent for e-signing (customer + manager), the sealed copy filed back; or a
 * paper one recorded from a scan with its reason. Only a signed one bills.
 */
export function AcceptanceCertificatesCard({
  projectId,
}: {
  projectId: string;
}) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    version: number;
    view: View | null;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<{
    round: Round;
    layoutId?: string;
    mode: "sequential" | "parallel";
    days: number;
    note: string;
    signers: Record<string, SignerDraft>;
  } | null>(null);
  const [links, setLinks] = useState<
    { signerId: string; name: string; link: string }[] | null
  >(null);
  const [paper, setPaper] = useState<{
    round: Round;
    reason: string;
    file: File | null;
  } | null>(null);
  const [withdrawing, setWithdrawing] = useState<{
    round: Round;
    reason: string;
  } | null>(null);
  const base = `delivery/projects/${projectId}/certificates`;

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
    return () => {
      live = false;
    };
  }, [base, version]);

  const view = loaded?.view ?? null;
  const reload = () => setVersion((value) => value + 1);

  async function call<T>(path: string, init: RequestInit, done: string) {
    setBusy(true);
    const result = await appApi<T>(path, init);
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return null;
    }
    void message.success(done);
    reload();
    return result.data;
  }

  const layout = view?.layouts.find((l) => l.id === sending?.layoutId);
  const signerOf = (key: string): SignerDraft =>
    sending?.signers[key] ?? {
      kind: "external",
      name: "",
      email: "",
      phone: "",
    };
  const setSigner = (key: string, change: Partial<SignerDraft>) =>
    sending &&
    setSending({
      ...sending,
      signers: { ...sending.signers, [key]: { ...signerOf(key), ...change } },
    });

  async function send() {
    if (!sending || !layout) return;
    const data = await call<
      View & { links: { signerId: string; name: string; link: string }[] }
    >(
      `${base}/${sending.round.acceptanceId}/send`,
      {
        method: "POST",
        body: JSON.stringify({
          layout_id: layout.id,
          mode: sending.mode,
          expires_in_days: sending.days,
          message: sending.note || undefined,
          signers: layout.fields.map((field) => {
            const signer = signerOf(field.key);
            return signer.kind === "internal"
              ? {
                  field_key: field.key,
                  kind: "internal",
                  user_id: signer.userId,
                }
              : {
                  field_key: field.key,
                  kind: "external",
                  name: signer.name,
                  email: signer.email || undefined,
                  phone: signer.phone || undefined,
                };
          }),
        }),
      },
      e.created,
    );
    if (data) {
      setSending(null);
      if (data.links?.length) setLinks(data.links);
    }
  }

  async function savePaper() {
    if (!paper) return;
    const form = new FormData();
    form.append("reason", paper.reason.trim());
    if (paper.file) form.append("file", paper.file);
    if (
      await call(
        `${base}/${paper.round.acceptanceId}/paper`,
        { method: "POST", body: form },
        m.paperSaved,
      )
    )
      setPaper(null);
  }

  return (
    <Card size="small" title={m.title}>
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !view ? (
        <Skeleton active />
      ) : (
        <Table<Round>
          rowKey="acceptanceId"
          size="small"
          pagination={false}
          dataSource={view.rounds}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 760 }}
          columns={[
            { title: m.round, dataIndex: "label", width: 70 },
            {
              title: m.phase,
              dataIndex: "phase",
              render: (v: string | null) => v ?? "—",
            },
            {
              title: m.result,
              dataIndex: "result",
              width: 140,
              render: (v: string) => m.results[v] ?? v,
            },
            {
              title: m.certificate,
              key: "cert",
              render: (_, row) =>
                row.certificate ? (
                  <Space orientation="vertical" size={0}>
                    <Space size={4}>
                      <Tag color={STATUS_COLOR[row.certificate.status]}>
                        {m.statuses[row.certificate.status]}
                        {row.certificate.status === "signed" &&
                        row.certificate.source === "paper"
                          ? ` · ${m.paperTag}`
                          : ""}
                      </Tag>
                      <Text className="text-xs">
                        {row.certificate.certificateNo}
                      </Text>
                    </Space>
                    {row.certificate.status === "signed" ? (
                      <a
                        href={`/api/app/${base}/${row.acceptanceId}/signed`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FilePdfOutlined /> {m.signedFile}
                      </a>
                    ) : row.certificate.status === "draft" ? (
                      <a
                        href={`/api/app/${base}/${row.acceptanceId}/draft`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FilePdfOutlined /> {m.draftFile}
                      </a>
                    ) : null}
                    {row.certificate.paperReason ? (
                      <Text type="secondary" className="text-xs">
                        {m.paperReason}: {row.certificate.paperReason}
                      </Text>
                    ) : null}
                  </Space>
                ) : (
                  <Tag color="warning">{m.none}</Tag>
                ),
            },
            ...(view.canManage
              ? [
                  {
                    key: "actions",
                    width: 260,
                    align: "right" as const,
                    render: (_: unknown, row: Round) => {
                      const status = row.certificate?.status;
                      if (status === "signed") return null;
                      return (
                        <Space wrap>
                          {status === "sent" ? (
                            <Button
                              size="small"
                              danger
                              onClick={() =>
                                setWithdrawing({ round: row, reason: "" })
                              }
                            >
                              {m.withdraw}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              loading={busy}
                              onClick={() =>
                                void call(
                                  `${base}/${row.acceptanceId}/draft`,
                                  { method: "POST", body: "{}" },
                                  m.drafted,
                                )
                              }
                            >
                              {status === "draft" ? m.redraft : m.draft}
                            </Button>
                          )}
                          {status === "draft" ? (
                            <Button
                              size="small"
                              type="primary"
                              disabled={!view.layouts.length}
                              onClick={() =>
                                setSending({
                                  round: row,
                                  layoutId: view.layouts[0]?.id,
                                  mode: "sequential",
                                  days: 14,
                                  note: "",
                                  signers: {},
                                })
                              }
                            >
                              {e.send}
                            </Button>
                          ) : null}
                          {status !== "sent" ? (
                            <Button
                              size="small"
                              onClick={() =>
                                setPaper({ round: row, reason: "", file: null })
                              }
                            >
                              {m.paper}
                            </Button>
                          ) : null}
                        </Space>
                      );
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
      {view && !view.layouts.length && view.canManage ? (
        <Text type="secondary" className="mt-2 block text-xs">
          {m.noLayouts}
        </Text>
      ) : null}

      <Modal
        open={!!sending}
        width={720}
        title={`${e.send} — ${sending?.round.label ?? ""}`}
        okText={e.createAndSend}
        okButtonProps={{ loading: busy, disabled: !layout }}
        onOk={() => void send()}
        onCancel={() => setSending(null)}
        destroyOnHidden
      >
        {sending && view ? (
          <div className="space-y-2">
            <label className="block text-xs">
              {e.layout}
              <Select
                className="w-full"
                value={sending.layoutId}
                onChange={(layoutId: string) =>
                  setSending({ ...sending, layoutId, signers: {} })
                }
                options={view.layouts.map((l) => ({
                  value: l.id,
                  label: l.name,
                }))}
              />
            </label>
            <Space wrap>
              <Radio.Group
                value={sending.mode}
                onChange={(ev) =>
                  setSending({
                    ...sending,
                    mode: ev.target.value as "sequential" | "parallel",
                  })
                }
                options={[
                  { value: "sequential", label: e.modes.sequential },
                  { value: "parallel", label: e.modes.parallel },
                ]}
              />
              <span className="text-xs">{e.expires}</span>
              <InputNumber
                min={1}
                max={90}
                value={sending.days}
                onChange={(days) =>
                  setSending({ ...sending, days: days ?? 14 })
                }
              />
            </Space>
            {(layout?.fields ?? []).map((field) => {
              const signer = signerOf(field.key);
              return (
                <div
                  key={field.key}
                  className="rounded border border-solid border-black/10 p-2 dark:border-white/15"
                >
                  <Text strong className="block text-xs">
                    {field.label}
                  </Text>
                  <Radio.Group
                    size="small"
                    value={signer.kind}
                    onChange={(ev) =>
                      setSigner(field.key, {
                        kind: ev.target.value as SignerDraft["kind"],
                      })
                    }
                    options={[
                      { value: "external", label: m.customerSide },
                      { value: "internal", label: e.internalUser },
                    ]}
                  />
                  {signer.kind === "internal" ? (
                    <Select
                      className="mt-1 w-full"
                      showSearch={{ optionFilterProp: "label" }}
                      value={signer.userId}
                      onChange={(userId: string) =>
                        setSigner(field.key, { userId })
                      }
                      options={view.people.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                    />
                  ) : (
                    <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3">
                      <Input
                        placeholder={e.externalName}
                        value={signer.name}
                        onChange={(ev) =>
                          setSigner(field.key, { name: ev.target.value })
                        }
                      />
                      <Input
                        placeholder={e.email}
                        value={signer.email}
                        onChange={(ev) =>
                          setSigner(field.key, { email: ev.target.value })
                        }
                      />
                      <Input
                        placeholder={e.phone}
                        value={signer.phone}
                        onChange={(ev) =>
                          setSigner(field.key, { phone: ev.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <Input.TextArea
              rows={2}
              maxLength={1000}
              placeholder={e.message}
              value={sending.note}
              onChange={(ev) =>
                setSending({ ...sending, note: ev.target.value })
              }
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!links}
        title={e.created}
        footer={null}
        onCancel={() => setLinks(null)}
      >
        <Text className="mb-2 block text-sm">{e.links}</Text>
        {(links ?? []).map((link) => (
          <div key={link.signerId} className="mb-2">
            <Text strong className="block">
              {link.name}
            </Text>
            <Input.Search
              readOnly
              value={link.link}
              enterButton={e.copy}
              onSearch={async (value) => {
                await navigator.clipboard
                  .writeText(value)
                  .catch(() => undefined);
                void message.success(e.copied);
              }}
            />
          </div>
        ))}
      </Modal>

      <Modal
        open={!!paper}
        title={`${m.paper} — ${paper?.round.label ?? ""}`}
        okText={m.save}
        okButtonProps={{
          loading: busy,
          disabled:
            !paper?.reason.trim() ||
            (!paper.file && !paper.round.uploadedCertificate),
        }}
        onOk={() => void savePaper()}
        onCancel={() => setPaper(null)}
        destroyOnHidden
      >
        {paper ? (
          <div className="space-y-2">
            <Input.TextArea
              rows={2}
              maxLength={1000}
              placeholder={m.paperReasonHint}
              value={paper.reason}
              onChange={(ev) => setPaper({ ...paper, reason: ev.target.value })}
            />
            {paper.round.uploadedCertificate && !paper.file ? (
              <Text type="secondary" className="block text-xs">
                {m.useUploaded.replace("{f}", paper.round.uploadedCertificate)}
              </Text>
            ) : null}
            <Upload
              maxCount={1}
              accept=".pdf,.jpg,.jpeg,.png"
              beforeUpload={(file) => {
                setPaper({ ...paper, file });
                return false;
              }}
              onRemove={() => setPaper({ ...paper, file: null })}
            >
              <Button icon={<UploadOutlined />}>{m.scan}</Button>
            </Upload>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!withdrawing}
        title={m.withdraw}
        okText={m.withdraw}
        okButtonProps={{
          danger: true,
          loading: busy,
          disabled: !withdrawing?.reason.trim(),
        }}
        onOk={async () => {
          if (!withdrawing) return;
          if (
            await call(
              `${base}/${withdrawing.round.acceptanceId}/withdraw`,
              {
                method: "POST",
                body: JSON.stringify({ reason: withdrawing.reason.trim() }),
              },
              m.withdrawn,
            )
          )
            setWithdrawing(null);
        }}
        onCancel={() => setWithdrawing(null)}
      >
        <Input.TextArea
          rows={2}
          maxLength={1000}
          placeholder={m.withdrawReason}
          value={withdrawing?.reason ?? ""}
          onChange={(ev) =>
            withdrawing &&
            setWithdrawing({ ...withdrawing, reason: ev.target.value })
          }
        />
      </Modal>
    </Card>
  );
}
