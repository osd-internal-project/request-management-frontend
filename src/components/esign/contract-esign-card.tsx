"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { EsignEnvelope, EsignLayout } from "@/lib/api/esign";
import { messages } from "@/lib/messages";

const m = messages.esign.contract;
const e = messages.esign;

interface SignerDraft {
  kind: "internal" | "external";
  userId?: string;
  name: string;
  email: string;
  phone: string;
}

const at = (value: string) => dayjs(value).format("D MMM YY HH:mm");

/**
 * CD-14 / CD-160 — on a contract: its PDF sent for signing, who has signed,
 * the history, and the sealed copy (also filed with the contract's files).
 * Sending names a signer for each field of a layout; the external signers'
 * links are shown once, to be passed on (no email yet).
 */
export function ContractEsignCard({
  contractId,
  envelopes,
  documents,
  layouts,
  people,
  canSend,
}: {
  readonly contractId: string;
  readonly envelopes: EsignEnvelope[];
  readonly documents: { id: string; fileName: string; mimeType: string }[];
  readonly layouts: EsignLayout[];
  readonly people: { id: string; name: string }[];
  readonly canSend: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const pdfs = documents.filter((doc) => doc.mimeType === "application/pdf");
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string | undefined>(pdfs[0]?.id);
  const [layoutId, setLayoutId] = useState<string | undefined>(layouts[0]?.id);
  const [mode, setMode] = useState<"sequential" | "parallel">("sequential");
  const [days, setDays] = useState(14);
  const [note, setNote] = useState("");
  const [signers, setSigners] = useState<Record<string, SignerDraft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<EsignEnvelope["links"] | null>(null);
  const layout = useMemo(
    () => layouts.find((one) => one.id === layoutId),
    [layouts, layoutId],
  );

  const signerOf = (key: string): SignerDraft =>
    signers[key] ?? { kind: "external", name: "", email: "", phone: "" };
  const setSigner = (key: string, change: Partial<SignerDraft>) =>
    setSigners({ ...signers, [key]: { ...signerOf(key), ...change } });

  async function send() {
    if (!documentId || !layout) return;
    setBusy(true);
    setError(null);
    const created = await appApi<EsignEnvelope>(`contracts/${contractId}/esign`, {
      method: "POST",
      body: JSON.stringify({
        document_id: documentId,
        layout_id: layout.id,
        mode,
        expires_in_days: days,
        message: note || undefined,
        signers: layout.fields.map((field) => {
          const signer = signerOf(field.key);
          return signer.kind === "internal"
            ? { field_key: field.key, kind: "internal", user_id: signer.userId }
            : {
                field_key: field.key,
                kind: "external",
                name: signer.name,
                email: signer.email || undefined,
                phone: signer.phone || undefined,
              };
        }),
      }),
    });
    if (!created.ok) {
      setBusy(false);
      setError(created.message);
      return;
    }
    const sent = await appApi<EsignEnvelope>(
      `esign/envelopes/${created.data.id}/send`,
      { method: "POST", body: "{}" },
    );
    setBusy(false);
    if (!sent.ok) {
      setError(sent.message);
      return;
    }
    message.success(m.created);
    setOpen(false);
    setLinks(sent.data.links ?? []);
    router.refresh();
  }

  async function cancel(id: string) {
    let reason = "";
    Modal.confirm({
      title: m.cancel,
      content: (
        <Input.TextArea
          rows={2}
          aria-label={m.cancelReason}
          placeholder={m.cancelReason}
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await appApi(`esign/envelopes/${id}/cancel`, {
          method: "POST",
          body: JSON.stringify({ reason: reason || "-" }),
        });
        if (!result.ok) message.error(result.message);
        else {
          message.success(m.cancelled);
          router.refresh();
        }
      },
    });
  }

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        canSend ? (
          <Button
            size="small"
            disabled={!pdfs.length || !layouts.length}
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            {m.send}
          </Button>
        ) : null
      }
    >
      {canSend && !pdfs.length && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.noPdf}
        </Text>
      )}
      {canSend && !layouts.length && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.noLayouts}
        </Text>
      )}
      {!envelopes.length ? (
        <Text type="secondary">{m.empty}</Text>
      ) : (
        <div className="flex flex-col gap-3">
          {envelopes.map((envelope) => (
            <div key={envelope.id} className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag color={e.statusColor[envelope.status]}>
                    {e.status[envelope.status]}
                  </Tag>
                  <Text className="text-sm">{envelope.originalName}</Text>
                  {envelope.verifyCode && (
                    <Text type="secondary" className="text-xs">
                      {m.verifyCode(envelope.verifyCode)}
                    </Text>
                  )}
                </div>
                <div className="flex gap-2">
                  {envelope.status === "completed" && (
                    <a
                      href={`/api/app/esign/envelopes/${envelope.id}/signed`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {m.signed}
                    </a>
                  )}
                  {canSend &&
                    (envelope.status === "sent" || envelope.status === "draft") && (
                      <Button size="small" danger onClick={() => void cancel(envelope.id)}>
                        {m.cancel}
                      </Button>
                    )}
                </div>
              </div>
              <div className="mt-2 divide-y">
                {envelope.signers.map((signer) => (
                  <div
                    key={signer.id}
                    className="flex flex-wrap items-center gap-2 py-1 text-sm"
                  >
                    <Text type="secondary" className="text-xs">
                      {m.order(signer.order)}
                    </Text>
                    <span className="font-medium">{signer.label}</span>
                    <span>{signer.name}</span>
                    <Tag>{e.kinds[signer.kind]}</Tag>
                    <Tag color={e.signerColor[signer.status]}>
                      {e.signerStatus[signer.status]}
                    </Tag>
                    {signer.signedAt && (
                      <Text type="secondary" className="text-xs">
                        {m.signedAt(at(signer.signedAt))}
                      </Text>
                    )}
                    {signer.declinedReason && (
                      <Text type="danger" className="text-xs">
                        {signer.declinedReason}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
              {envelope.status === "sent" && (
                <Text type="secondary" className="text-xs">
                  {m.expiresAt(at(envelope.expiresAt))}
                </Text>
              )}
              <Collapse
                ghost
                size="small"
                items={[
                  {
                    key: "history",
                    label: m.history,
                    children: envelope.history.map((event, index) => (
                      <div key={index} className="text-xs">
                        {at(event.at)} · {e.events[event.type] ?? event.type}
                        {event.who ? ` · ${event.who}` : ""}
                        {event.ip ? ` · IP ${event.ip}` : ""}
                      </div>
                    )),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={m.send}
        width={760}
        onCancel={() => setOpen(false)}
        onOk={() => void send()}
        okText={m.createAndSend}
        confirmLoading={busy}
        destroyOnHidden
      >
        <div className="flex flex-col gap-3">
          {error && <Alert type="error" showIcon title={error} />}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs">
              {m.document}
              <Select
                className="w-full"
                value={documentId}
                onChange={setDocumentId}
                options={pdfs.map((doc) => ({ value: doc.id, label: doc.fileName }))}
              />
            </label>
            <label className="text-xs">
              {m.layout}
              <Select
                className="w-full"
                value={layoutId}
                onChange={setLayoutId}
                options={layouts.map((one) => ({
                  value: one.id,
                  label: `${one.code} · ${one.name}`,
                }))}
              />
            </label>
            <label className="text-xs">
              {m.mode}
              <Select
                className="w-full"
                value={mode}
                onChange={setMode}
                options={Object.entries(m.modes).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>
            <label className="text-xs">
              {m.expires}
              <InputNumber
                className="w-full!"
                min={1}
                max={90}
                value={days}
                onChange={(value) => setDays(Number(value ?? 14))}
              />
            </label>
          </div>
          <label className="text-xs">
            {m.message}
            <Input.TextArea
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          {layout?.fields.map((field) => {
            const signer = signerOf(field.key);
            return (
              <div key={field.key} className="rounded border p-2">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <Text strong>
                    {field.label}{" "}
                    <Text type="secondary" className="text-xs">
                      {m.order(field.order)}
                    </Text>
                  </Text>
                  <Radio.Group
                    size="small"
                    optionType="button"
                    value={signer.kind}
                    onChange={(event) =>
                      setSigner(field.key, {
                        kind: event.target.value as SignerDraft["kind"],
                      })
                    }
                    options={[
                      { value: "internal", label: e.kinds.internal },
                      { value: "external", label: e.kinds.external },
                    ]}
                  />
                </div>
                {signer.kind === "internal" ? (
                  <Select
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                    aria-label={m.internalUser}
                    placeholder={m.internalUser}
                    value={signer.userId}
                    onChange={(userId: string) => setSigner(field.key, { userId })}
                    options={people.map((person) => ({
                      value: person.id,
                      label: person.name,
                    }))}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      aria-label={m.externalName}
                      placeholder={m.externalName}
                      value={signer.name}
                      onChange={(event) =>
                        setSigner(field.key, { name: event.target.value })
                      }
                    />
                    <Input
                      aria-label={m.email}
                      placeholder={m.email}
                      value={signer.email}
                      onChange={(event) =>
                        setSigner(field.key, { email: event.target.value })
                      }
                    />
                    <Input
                      aria-label={m.phone}
                      placeholder={m.phone}
                      value={signer.phone}
                      onChange={(event) =>
                        setSigner(field.key, { phone: event.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={Boolean(links?.length)}
        title={m.created}
        footer={null}
        onCancel={() => setLinks(null)}
      >
        <Text className="mb-2 block text-sm">{m.links}</Text>
        {(links ?? []).map((link) => (
          <div key={link.signerId} className="mb-2">
            <Text strong className="block">
              {link.name}
            </Text>
            <Input.Search
              readOnly
              value={link.link}
              enterButton={m.copy}
              onSearch={async (value) => {
                await navigator.clipboard.writeText(value).catch(() => undefined);
                message.success(m.copied);
              }}
            />
          </div>
        ))}
      </Modal>
    </Card>
  );
}
