"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import {
  createWebhook,
  listWebhookDeliveries,
  listWebhookEvents,
  listWebhooks,
  rotateWebhookSecret,
  testWebhook,
  updateWebhook,
  type WebhookDelivery,
  type WebhookRow,
  type WebhookWithSecret,
} from "@/lib/api/webhooks";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.webhooks;

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.reason).join("; "),
      )
    : result.message;
}

function dateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * ตั้งปลายทาง webhook ขาออกของบริษัท (`admin.integration.manage`, G-07).
 *
 * secret แสดงครั้งเดียวหลังเพิ่มหรือออกใหม่ — หน้านี้ไม่เก็บไว้ที่อื่นนอกจาก
 * state ของหน้าต่างนั้น
 *
 * `integrationId` = แสดงเฉพาะ webhook ของระบบนั้น และเพิ่มใหม่ให้ระบบนั้น.
 */
export function WebhookAdmin({
  integrationId,
}: { readonly integrationId?: string } = {}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<WebhookRow[] | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** null = closed; "new" = adding; a row = editing it. */
  const [form, setForm] = useState<WebhookRow | "new" | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [secret, setSecret] = useState<WebhookWithSecret | null>(null);
  const [history, setHistory] = useState<WebhookRow | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);

  const refresh = useCallback(
    () =>
      listWebhooks().then((result) => {
        if (!result.ok) return setError(result.message);
        setRows(
          integrationId
            ? result.data.filter((row) => row.integration_id === integrationId)
            : result.data,
        );
      }),
    [integrationId],
  );

  useEffect(() => {
    void refresh();
    void listWebhookEvents().then((result) => {
      if (result.ok) setEvents(result.data.map((event) => event.code));
    });
  }, [refresh]);

  const ready = name.trim().length > 0 && url.trim().length > 0 && chosen.length > 0;

  function open(row: WebhookRow | "new") {
    setName(row === "new" ? "" : row.name);
    setUrl(row === "new" ? "" : row.url);
    setChosen(row === "new" ? [] : [...row.events]);
    setForm(row);
  }

  async function save() {
    if (!ready || form === null) return;
    setBusy(true);
    const payload = { name: name.trim(), url: url.trim(), events: chosen };
    if (form === "new") {
      const result = await createWebhook({
        ...payload,
        ...(integrationId ? { integration_id: integrationId } : {}),
      });
      setBusy(false);
      if (!result.ok) return void message.error(errorText(result));
      setSecret(result.data);
    } else {
      const result = await updateWebhook(form.id, payload);
      setBusy(false);
      if (!result.ok) return void message.error(errorText(result));
      message.success(m.saved);
    }
    setForm(null);
    await refresh();
  }

  async function toggle(row: WebhookRow) {
    const result = await updateWebhook(row.id, { active: !row.active });
    if (!result.ok) return void message.error(errorText(result));
    await refresh();
  }

  async function rotate(row: WebhookRow) {
    const result = await rotateWebhookSecret(row.id);
    if (!result.ok) return void message.error(errorText(result));
    setSecret(result.data);
  }

  async function ping(row: WebhookRow) {
    const result = await testWebhook(row.id);
    if (!result.ok) return void message.error(errorText(result));
    message.success(m.testQueued);
  }

  async function openHistory(row: WebhookRow) {
    setHistory(row);
    setDeliveries(null);
    const result = await listWebhookDeliveries(row.id);
    if (!result.ok) return void message.error(errorText(result));
    setDeliveries(result.data);
  }

  if (error) {
    return <Alert type="error" showIcon title={m.loadFailed} description={error} />;
  }

  if (!rows) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title={m.title}
        extra={
          <Button type="primary" onClick={() => open("new")}>
            {m.add}
          </Button>
        }
      >
        <Table<WebhookRow>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: m.empty }}
          scroll={{ x: true }}
          columns={[
            { title: m.columnName, dataIndex: "name" },
            {
              title: m.columnUrl,
              dataIndex: "url",
              render: (value: string) => <code className="text-xs break-all">{value}</code>,
            },
            {
              title: m.columnEvents,
              dataIndex: "events",
              render: (codes: string[]) => (
                <Space size={[0, 4]} wrap>
                  {codes.map((code) => (
                    <Tag key={code}>{code}</Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: m.columnStatus,
              dataIndex: "active",
              width: 90,
              render: (active: boolean) => (
                <Tag color={active ? "green" : "default"}>
                  {active ? m.active : m.inactive}
                </Tag>
              ),
            },
            {
              title: m.columnActions,
              key: "actions",
              width: 360,
              render: (_, row) => (
                <span className="flex flex-wrap gap-2">
                  <Button size="small" onClick={() => open(row)}>
                    {m.edit}
                  </Button>
                  <Button size="small" onClick={() => void toggle(row)}>
                    {row.active ? m.disable : m.enable}
                  </Button>
                  <Button size="small" disabled={!row.active} onClick={() => void ping(row)}>
                    {m.test}
                  </Button>
                  <Button size="small" onClick={() => void openHistory(row)}>
                    {m.history}
                  </Button>
                  <Popconfirm
                    title={m.rotateConfirm}
                    description={m.rotateConfirmBody}
                    onConfirm={() => rotate(row)}
                  >
                    <Button size="small" danger>
                      {m.rotate}
                    </Button>
                  </Popconfirm>
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={form !== null}
        title={form === "new" ? m.add : m.edit}
        okText={m.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !ready }}
        onCancel={() => setForm(null)}
        onOk={() => void save()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Input
            placeholder={m.formName}
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <Input
              placeholder={m.formUrl}
              value={url}
              maxLength={2000}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Text type="secondary" className="text-xs">
              {m.formUrlHint}
            </Text>
          </div>
          <div>
            <Text strong className="text-xs">
              {m.formEvents}
            </Text>
            <Checkbox.Group
              className="mt-2 grid gap-1"
              value={chosen}
              onChange={(values) => setChosen(values as string[])}
            >
              {events.map((code) => (
                <Checkbox key={code} value={code}>
                  <code className="text-xs">{code}</code>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>
        </Space>
      </Modal>

      <Modal
        open={secret !== null}
        title={m.secretTitle}
        okText={m.secretDone}
        onOk={() => setSecret(null)}
        onCancel={() => setSecret(null)}
        cancelButtonProps={{ style: { display: "none" } }}
        destroyOnHidden
      >
        <Paragraph type="warning">{m.secretBody}</Paragraph>
        <Input.TextArea readOnly autoSize value={secret?.secret} />
      </Modal>

      <Drawer
        open={history !== null}
        title={`${m.history} · ${history?.name ?? ""}`}
        width={720}
        onClose={() => setHistory(null)}
        extra={
          history && (
            <Button size="small" onClick={() => void openHistory(history)}>
              ↻
            </Button>
          )
        }
      >
        {deliveries === null ? (
          <Spin />
        ) : (
          <Table<WebhookDelivery>
            rowKey="id"
            size="small"
            dataSource={deliveries}
            pagination={false}
            locale={{ emptyText: m.historyEmpty }}
            columns={[
              {
                title: m.columnAt,
                dataIndex: "created_at",
                render: (iso: string) => dateTime(iso),
              },
              { title: m.columnEvents, dataIndex: "event" },
              {
                title: m.columnStatus,
                dataIndex: "status",
                render: (status: string) => (
                  <Tag color={m.deliveryColor[status]}>{m.deliveryStatus[status]}</Tag>
                ),
              },
              { title: m.columnAttempts, dataIndex: "attempts", width: 70 },
              {
                title: m.columnResult,
                key: "result",
                render: (_, row) =>
                  row.last_error ?? (row.last_status_code ? `HTTP ${row.last_status_code}` : "—"),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
