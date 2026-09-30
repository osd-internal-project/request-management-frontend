"use client";

import { useState } from "react";
import { Alert, Button, Card, Checkbox, Input, Modal } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type { EsignSignerView } from "@/lib/api/esign";
import { messages } from "@/lib/messages";
import { SignaturePad, type SignatureValue } from "./signature-pad";

const m = messages.esign.sign;

/**
 * CD-168 — the signing screen, for an employee (signed in) and a customer
 * (the link, after the code): the whole document to read first — opening it
 * is what records "read" — then the signature, the consent, sign or decline.
 */
export function SignPanel({
  view,
  documentUrl,
  onSign,
  onDecline,
}: {
  readonly view: EsignSignerView;
  readonly documentUrl: string;
  /** Resolves to an error message, or null when signed. */
  readonly onSign: (value: SignatureValue) => Promise<string | null>;
  readonly onDecline: (reason: string) => Promise<string | null>;
}) {
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [consent, setConsent] = useState(false);
  const [viewed, setViewed] = useState(view.viewed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const open = view.status === "pending" && view.envelopeStatus === "sent";

  async function sign() {
    if (!viewed) return setError(m.mustRead);
    if (!signature) return setError(m.needSignature);
    if (!consent) return setError(m.needConsent);
    setBusy(true);
    setError(null);
    setError(await onSign(signature));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Title level={4} className="mb-1!">
          {view.title}
        </Title>
        <Text type="secondary" className="block">
          {m.role(view.role)} · {view.name}
        </Text>
        {view.message && (
          <Text className="mt-1 block whitespace-pre-line">{view.message}</Text>
        )}
      </div>

      {!open ? (
        <Alert
          type={view.status === "signed" ? "success" : "info"}
          showIcon
          title={view.status === "signed" ? m.signed : m.done}
          description={view.verifyCode ? m.verifyAt(view.verifyCode) : undefined}
        />
      ) : (
        <>
          {!view.turn.may && (
            <Alert type="info" showIcon title={m.notYourTurn(view.turn.waitingFor)} />
          )}
          <Card
            size="small"
            title={m.read}
            extra={
              <a href={documentUrl} target="_blank" rel="noreferrer">
                {m.openFull}
              </a>
            }
          >
            <iframe
              src={documentUrl}
              title={view.originalName}
              className="h-[70vh] w-full rounded border"
              onLoad={() => setViewed(true)}
            />
          </Card>

          <Card size="small" title={m.method}>
            <SignaturePad onChange={setSignature} defaultName={view.name} />
            <Checkbox
              className="mt-3"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            >
              {m.consent}
            </Checkbox>
            {error && <Alert type="error" showIcon className="mt-2" title={error} />}
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <Button danger disabled={busy} onClick={() => setDeclining(true)}>
                {m.decline}
              </Button>
              <Button
                type="primary"
                loading={busy}
                disabled={!view.turn.may}
                onClick={() => void sign()}
              >
                {m.sign}
              </Button>
            </div>
          </Card>
          <Text type="secondary" className="text-xs">
            {messages.esign.public.expiresAt(
              dayjs(view.expiresAt).format("D MMM YYYY HH:mm"),
            )}
          </Text>
        </>
      )}

      <Modal
        open={declining}
        title={m.decline}
        onCancel={() => setDeclining(false)}
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        okText={m.decline}
        confirmLoading={busy}
        onOk={async () => {
          setBusy(true);
          const failed = await onDecline(reason);
          setBusy(false);
          if (failed) setError(failed);
          else setDeclining(false);
        }}
      >
        <Input.TextArea
          rows={3}
          maxLength={1000}
          aria-label={m.declineReason}
          placeholder={m.declineReason}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
