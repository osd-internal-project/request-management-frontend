"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Radio, Spin, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  getMailSettings,
  saveMailSettings,
  testMailSettings,
  type MailMode,
  type MailSettings,
  type MailSettingsPayload,
} from "@/lib/api/mail-settings";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.mailSettings;
const MODES: MailMode[] = ["off", "mock", "graph"];

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.field).join(", "),
      )
    : result.message;
}

function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <Text strong className="text-sm">
        {label}
      </Text>
      {children}
      {hint && (
        <Text type="secondary" className="text-xs">
          {hint}
        </Text>
      )}
    </label>
  );
}

/** ตั้งค่า → อีเมลงานขาย — one form per company; the secret goes in, never out. */
export function MailSettingsAdmin() {
  const { message } = App.useApp();
  const [current, setCurrent] = useState<MailSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<MailMode>("off");
  const [mailbox, setMailbox] = useState("");
  const [senderName, setSenderName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  const apply = useCallback((settings: MailSettings) => {
    setCurrent(settings);
    setMode(settings.mode);
    setMailbox(settings.mailbox);
    setSenderName(settings.sender_name);
    setTenantId(settings.tenant_id);
    setClientId(settings.client_id);
    setClientSecret("");
  }, []);

  useEffect(() => {
    void getMailSettings().then((result) => {
      if (!result.ok) return setLoadError(errorText(result));
      apply(result.data);
    });
  }, [apply]);

  function payload(): MailSettingsPayload {
    return {
      mode,
      mailbox: mailbox.trim(),
      sender_name: senderName.trim(),
      tenant_id: tenantId.trim(),
      client_id: clientId.trim(),
      ...(clientSecret.trim() ? { client_secret: clientSecret.trim() } : {}),
    };
  }

  async function save() {
    setBusy("save");
    const result = await saveMailSettings(payload());
    setBusy(null);
    if (!result.ok) return void message.error(errorText(result));
    // the secret leaves this page's state as soon as it is saved
    apply(result.data);
    message.success(m.saved);
  }

  async function test() {
    setBusy("test");
    const result = await testMailSettings({
      ...payload(),
      ...(testTo.trim() ? { to: testTo.trim() } : {}),
    });
    setBusy(null);
    if (!result.ok) return void message.error(errorText(result));
    const outcome = result.data;
    if (!outcome.ok) {
      return void message.error(m.testFailed(outcome.error ?? ""));
    }
    message.success(
      outcome.mode === "mock"
        ? m.testOkMock(outcome.to)
        : m.testOk(outcome.mailbox, outcome.to),
    );
    const refreshed = await getMailSettings();
    if (refreshed.ok) setCurrent(refreshed.data);
  }

  if (loadError) {
    return (
      <Alert
        type="error"
        showIcon
        message={m.loadFailed}
        description={loadError}
      />
    );
  }
  if (!current) return <Spin />;

  const graph = mode === "graph";

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {current.source === "env" && (
        <Alert type="info" showIcon message={m.sourceEnv} />
      )}
      {current.problem && (
        <Alert
          type="warning"
          showIcon
          message={m.problem}
          description={current.problem}
        />
      )}

      <Card size="small">
        <div className="flex flex-col gap-4">
          <Field label={m.mode}>
            <Radio.Group
              value={mode}
              onChange={(event) => setMode(event.target.value as MailMode)}
              className="flex flex-col gap-1"
            >
              {MODES.map((value) => (
                <Radio key={value} value={value}>
                  {m.modes[value]}
                </Radio>
              ))}
            </Radio.Group>
          </Field>

          {mode !== "off" && (
            <>
              <Field label={m.mailbox} hint={m.mailboxHint}>
                <Input
                  type="email"
                  value={mailbox}
                  onChange={(event) => setMailbox(event.target.value)}
                  placeholder="sales@osd.co.th"
                />
              </Field>
              <Field label={m.senderName}>
                <Input
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                />
              </Field>
            </>
          )}
        </div>
      </Card>

      {graph && (
        <Card size="small" title={m.graphTitle}>
          <div className="flex flex-col gap-4">
            <Text type="secondary" className="text-xs">
              {m.graphHint}
            </Text>
            <Field label={m.tenantId}>
              <Input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </Field>
            <Field label={m.clientId}>
              <Input
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </Field>
            <Field label={m.clientSecret} hint={m.clientSecretHint}>
              <Input.Password
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder={
                  current.client_secret_set ? m.clientSecretKeep : ""
                }
                autoComplete="new-password"
              />
            </Field>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Button
          type="primary"
          loading={busy === "save"}
          onClick={() => void save()}
        >
          {m.save}
        </Button>
        {mode !== "off" && (
          <>
            <div className="flex min-w-64 flex-1 flex-col gap-1">
              <Text type="secondary" className="text-xs">
                {m.testHint}
              </Text>
              <Input
                type="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder={m.testTo}
              />
            </div>
            <Button loading={busy === "test"} onClick={() => void test()}>
              {m.test}
            </Button>
          </>
        )}
      </div>

      {current.last_test_at && (
        <Text type="secondary" className="text-xs">
          {m.lastTest}: {dateTime(current.last_test_at)}{" "}
          {current.last_test_ok ? (
            <Tag color="green">{m.lastTestOk}</Tag>
          ) : (
            <Tag color="red">{m.lastTestFailed}</Tag>
          )}
          {!current.last_test_ok && current.last_test_error}
        </Text>
      )}
    </div>
  );
}
