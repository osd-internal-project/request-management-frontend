"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Input, Result, Spin } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import type { EsignSignerView } from "@/lib/api/esign";
import { messages } from "@/lib/messages";
import { SignPanel } from "./sign-panel";

const m = messages.esign.public;

async function call<T>(
  path: string,
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const response = await fetch(`/api/public/esign/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  if (!response) return { ok: false, message: m.unavailable };
  const json = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;
  return response.ok
    ? { ok: true, data: json }
    : { ok: false, message: json.message ?? m.unavailable };
}

/**
 * CD-166..168 — an external signer: the link opens this page; a one-time
 * code (email or SMS) confirms who they are; then the document, the
 * signature, done. The link works once — after signing it only says so.
 */
export function PublicSign({ token }: { readonly token: string }) {
  const [view, setView] = useState<EsignSignerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState<"signed" | "declined" | null>(null);

  const load = useCallback(async () => {
    const result = await call<EsignSignerView>(`public/${token}`);
    if (result.ok) setView(result.data);
    else setError(result.message);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (error && !view) {
    return <Result status="warning" title={m.title} subTitle={error} />;
  }
  if (!view) return <Spin className="mt-16 block" />;
  if (finished) {
    return (
      <Result
        status={finished === "signed" ? "success" : "info"}
        title={finished === "signed" ? messages.esign.sign.signed : messages.esign.sign.declined}
        subTitle={finished === "signed" ? m.thanks : undefined}
      />
    );
  }

  const pending = view.status === "pending" && view.envelopeStatus === "sent";
  if (pending && !view.verified) {
    return (
      <Card>
        <Title level={4}>{m.title}</Title>
        <Text className="block">{m.hello(view.name)}</Text>
        <Text className="block font-medium">{view.title}</Text>
        <Text type="secondary" className="mb-3 block">
          {messages.esign.sign.role(view.role)}
        </Text>
        <Alert type="info" showIcon className="mb-3" title={m.verifyFirst} />
        <div className="flex flex-wrap gap-2">
          {(view.channels ?? []).map((channel) => (
            <Button
              key={channel.channel}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const result = await call<{ to: string }>(`public/${token}/code`, {
                  channel: channel.channel,
                });
                setBusy(false);
                if (result.ok) setSentTo(result.data.to);
                else setError(result.message);
              }}
            >
              {m.sendCode(channel.to)}
            </Button>
          ))}
        </div>
        {sentTo && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Text type="secondary" className="block w-full text-xs">
              {m.codeSent(sentTo)}
            </Text>
            <Input
              className="max-w-40"
              inputMode="numeric"
              maxLength={6}
              aria-label={m.code}
              placeholder={m.code}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
            <Button
              type="primary"
              loading={busy}
              disabled={code.length !== 6}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const result = await call(`public/${token}/verify`, { code });
                setBusy(false);
                if (result.ok) await load();
                else setError(result.message);
              }}
            >
              {m.confirm}
            </Button>
          </div>
        )}
        {error && <Alert type="error" showIcon className="mt-3" title={error} />}
      </Card>
    );
  }

  return (
    <SignPanel
      view={view}
      documentUrl={`/api/public/esign/public/${token}/document`}
      onSign={async (value) => {
        const result = await call(`public/${token}/sign`, {
          ...value,
          consent: true,
        });
        if (!result.ok) return result.message;
        setFinished("signed");
        return null;
      }}
      onDecline={async (reason) => {
        const result = await call(`public/${token}/decline`, { reason });
        if (!result.ok) return result.message;
        setFinished("declined");
        return null;
      }}
    />
  );
}
