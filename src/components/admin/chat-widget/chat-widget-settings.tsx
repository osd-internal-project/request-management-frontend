"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Spin } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.chatWidget;

interface Settings {
  http_url: string | null;
  https_url: string | null;
  public_id: string | null;
  updated_at: string | null;
}

interface Values {
  http_url: string;
  https_url: string;
  public_id: string;
}

/** An empty field is allowed — it means "use the env value". */
function schemeRule(scheme: "http:" | "https:", message: string) {
  return {
    validator: (_: unknown, value: string | undefined) => {
      const trimmed = value?.trim();
      if (!trimmed) return Promise.resolve();
      try {
        if (new URL(trimmed).protocol === scheme) return Promise.resolve();
      } catch {
        // Not a URL — reported with the same message as a wrong scheme.
      }
      return Promise.reject(new Error(message));
    },
  };
}

export function ChatWidgetSettings({
  envUrl,
  envPublicId,
}: {
  envUrl: string;
  envPublicId: string;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function show(data: Settings) {
    setSettings(data);
    form.setFieldsValue({
      http_url: data.http_url ?? "",
      https_url: data.https_url ?? "",
      public_id: data.public_id ?? "",
    });
  }

  useEffect(() => {
    let live = true;
    void appApi<Settings>("chat-widget/settings").then((result) => {
      if (!live) return;
      if (result.ok) show(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
    // `show` only touches state and the form instance, both stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(values: Values) {
    setBusy(true);
    const result = await appApi<Settings>("chat-widget/settings", {
      method: "PUT",
      body: JSON.stringify({
        http_url: values.http_url.trim() || null,
        https_url: values.https_url.trim() || null,
        public_id: values.public_id.trim() || null,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    show(result.data);
    message.success(m.saved);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!settings) {
    return (
      <div className="py-10 text-center">
        <Spin />
      </div>
    );
  }

  const envIsHttps = envUrl.startsWith("https:");
  const fallback = (value: string) => (value ? m.envFallback(value) : undefined);

  return (
    <Card size="small" className="max-w-2xl">
      <Form<Values> form={form} layout="vertical" onFinish={save}>
        <Form.Item
          name="http_url"
          label={m.httpUrl}
          extra={m.httpUrlHelp}
          rules={[schemeRule("http:", m.mustBeHttp)]}
        >
          <Input allowClear placeholder={fallback(envIsHttps ? "" : envUrl)} />
        </Form.Item>
        <Form.Item
          name="https_url"
          label={m.httpsUrl}
          extra={m.httpsUrlHelp}
          rules={[schemeRule("https:", m.mustBeHttps)]}
        >
          <Input allowClear placeholder={fallback(envIsHttps ? envUrl : "")} />
        </Form.Item>
        <Form.Item name="public_id" label={m.publicId}>
          <Input allowClear placeholder={fallback(envPublicId)} />
        </Form.Item>
        <div className="flex items-center gap-3">
          <Button type="primary" htmlType="submit" loading={busy}>
            {m.save}
          </Button>
          {settings.updated_at && (
            <Text type="secondary" className="text-xs">
              {m.updatedAt(dayjs(settings.updated_at).format("DD/MM/YYYY HH:mm"))}
            </Text>
          )}
        </div>
      </Form>
    </Card>
  );
}
