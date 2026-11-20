"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Space, Spin } from "antd";
import Text from "antd/es/typography/Text";
import { Field } from "@/components/admin/mail-settings-admin";
import {
  getLineSettings,
  saveLineSettings,
  type LineSettings,
} from "@/lib/api/line";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.lineSettings;

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.field).join(", "),
      )
    : result.message;
}

/** ตั้งค่า → LINE ของบริษัท — one form per company; the secret goes in, never out. */
export function LineSettingsAdmin() {
  const { message } = App.useApp();
  const [current, setCurrent] = useState<LineSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [oaBasicId, setOaBasicId] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = useCallback((settings: LineSettings) => {
    setCurrent(settings);
    setChannelId(settings.login_channel_id);
    setOaBasicId(settings.oa_basic_id);
    setChannelSecret("");
  }, []);

  useEffect(() => {
    void getLineSettings().then((result) => {
      if (!result.ok) return setLoadError(errorText(result));
      apply(result.data);
    });
  }, [apply]);

  async function save() {
    setBusy(true);
    const result = await saveLineSettings({
      login_channel_id: channelId.trim(),
      oa_basic_id: oaBasicId.trim(),
      ...(channelSecret.trim()
        ? { login_channel_secret: channelSecret.trim() }
        : {}),
    });
    setBusy(false);
    if (!result.ok) return void message.error(errorText(result));
    // the secret leaves this page's state as soon as it is saved
    apply(result.data);
    message.success(m.saved);
  }

  async function copyCallback() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.callback_url);
      message.success(m.copied);
    } catch {
      // clipboard blocked (http, permissions) — the field stays selectable
      message.info(current.callback_url);
    }
  }

  if (loadError) {
    return (
      <Alert type="error" showIcon title={m.loadFailed} description={loadError} />
    );
  }
  if (!current) return <Spin />;

  const ready = !!current.login_channel_id && current.login_channel_secret_set;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Alert
        type={ready ? "success" : "info"}
        showIcon
        title={ready ? m.ready : m.notReady}
      />

      <Card size="small" title={m.channelTitle}>
        <div className="flex flex-col gap-4">
          <Text type="secondary" className="text-xs">
            {m.channelHint}
          </Text>
          <Field label={m.channelId}>
            <Input
              value={channelId}
              inputMode="numeric"
              onChange={(event) => setChannelId(event.target.value)}
              placeholder="2001234567"
            />
          </Field>
          <Field label={m.channelSecret} hint={m.channelSecretHint}>
            <Input.Password
              value={channelSecret}
              onChange={(event) => setChannelSecret(event.target.value)}
              placeholder={
                current.login_channel_secret_set ? m.channelSecretKeep : ""
              }
              autoComplete="new-password"
            />
          </Field>
          <Field label={m.oaBasicId} hint={m.oaBasicIdHint}>
            <Input
              value={oaBasicId}
              onChange={(event) => setOaBasicId(event.target.value)}
              placeholder="@osd"
            />
          </Field>
          <Field label={m.callbackUrl} hint={m.callbackUrlHint}>
            <Space.Compact className="w-full">
              <Input readOnly value={current.callback_url} />
              <Button onClick={() => void copyCallback()}>{m.copy}</Button>
            </Space.Compact>
          </Field>
        </div>
      </Card>

      <div>
        <Button type="primary" loading={busy} onClick={() => void save()}>
          {m.save}
        </Button>
      </div>
    </div>
  );
}
