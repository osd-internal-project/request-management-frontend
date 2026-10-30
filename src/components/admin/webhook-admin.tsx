"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import { MoreOutlined } from "@ant-design/icons";
import Paragraph from "antd/es/typography/Paragraph";
import { GroupedPicker } from "@/components/admin/integrations/grouped-picker";
import { SecretField, unwrap } from "@/components/admin/integrations/secret-field";
import {
  WEBHOOK_VERIFY_SNIPPET,
  webhookRequestFor,
} from "@/components/admin/integrations/api-example";
import { CodeBlock } from "@/components/admin/integrations/code-block";
import {
  createWebhook,
  getWebhookExamples,
  listWebhookDeliveries,
  listWebhookEvents,
  listWebhooks,
  redeliverWebhook,
  revealWebhookSecret,
  rotateWebhookSecret,
  testWebhook,
  updateWebhook,
  type WebhookDelivery,
  type WebhookExample,
  type WebhookRow,
  type WebhookWithSecret,
} from "@/lib/api/webhooks";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.webhooks;

/** `request.approved` → กลุ่ม `request`; กลุ่มที่ไม่มีหัวข้อไปรวมที่ "อื่น ๆ". */
function eventGroups(codes: readonly string[]) {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const prefix = code.split(".")[0] ?? "";
    const key = prefix in m.eventGroups ? prefix : "other";
    groups.set(key, [...(groups.get(key) ?? []), code]);
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    label: m.eventGroups[key],
    codes: list,
  }));
}

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
 * secret แสดงหลังเพิ่มหรือออกใหม่ และกดดูย้อนหลังได้ (ลง audit ทุกครั้ง) —
 * หน้านี้ไม่เก็บไว้ที่อื่นนอกจาก state ของช่องที่แสดงมัน
 *
 * `integrationId` = แสดงเฉพาะ webhook ของระบบนั้น และเพิ่มใหม่ให้ระบบนั้น.
 */
export function WebhookAdmin({
  integrationId,
}: { readonly integrationId?: string } = {}) {
  const { message, modal } = App.useApp();
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
  const [examplesFor, setExamplesFor] = useState<WebhookRow | null>(null);

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

  const ready =
    name.trim().length > 0 && url.trim().length > 0 && chosen.length > 0;

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

  function confirmRotate(row: WebhookRow) {
    modal.confirm({
      title: m.rotateConfirm,
      content: m.rotateConfirmBody,
      okText: m.rotate,
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await rotateWebhookSecret(row.id);
        if (!result.ok) return void message.error(errorText(result));
        setSecret(result.data);
      },
    });
  }

  async function redeliver(row: WebhookRow, delivery: WebhookDelivery) {
    const result = await redeliverWebhook(row.id, delivery.id);
    if (!result.ok) return void message.error(errorText(result));
    message.success(m.redelivered);
    await openHistory(row);
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
    return (
      <Alert type="error" showIcon title={m.loadFailed} description={error} />
    );
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
            {
              title: m.columnName,
              dataIndex: "name",
              render: (name: string, row) => (
                <div className="min-w-40">
                  <div>{name}</div>
                  <code className="text-xs break-all text-[var(--app-text-secondary)]">
                    {row.url}
                  </code>
                </div>
              ),
            },
            {
              title: m.columnEvents,
              dataIndex: "events",
              width: 110,
              render: (codes: string[]) => (
                <Popover
                  title={m.columnEvents}
                  content={
                    <Space size={[0, 4]} wrap className="max-w-sm">
                      {codes.map((code) => (
                        <Tag key={code}>{m.eventLabel[code] ?? code}</Tag>
                      ))}
                    </Space>
                  }
                >
                  <Tag className="cursor-pointer">{m.eventCount(codes.length)}</Tag>
                </Popover>
              ),
            },
            {
              title: m.columnSecret,
              key: "secret",
              width: 260,
              render: (_, row) => (
                <SecretField
                  hint="whsec_…"
                  load={() =>
                    revealWebhookSecret(row.id).then((result) =>
                      unwrap(result, (data) => data.secret),
                    )
                  }
                />
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
              width: 340,
              render: (_, row) => (
                <span className="flex items-center gap-1">
                  <Button type="link" size="small" onClick={() => setExamplesFor(row)}>
                    {m.examples}
                  </Button>
                  <Button size="small" onClick={() => open(row)}>
                    {m.edit}
                  </Button>
                  <Button size="small" onClick={() => void openHistory(row)}>
                    {m.history}
                  </Button>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        { key: "toggle", label: row.active ? m.disable : m.enable },
                        { key: "test", label: m.test, disabled: !row.active },
                        { type: "divider" },
                        { key: "rotate", label: m.rotate, danger: true },
                      ],
                      onClick: ({ key }) => {
                        if (key === "toggle") void toggle(row);
                        else if (key === "test") void ping(row);
                        else confirmRotate(row);
                      },
                    }}
                  >
                    <Button size="small" icon={<MoreOutlined />} aria-label={m.more} />
                  </Dropdown>
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
        <Form layout="vertical" component="div">
          <Form.Item label={m.columnName} required>
            <Input
              placeholder={m.formName}
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={m.formUrl} required extra={m.formUrlHint}>
            <Input
              placeholder="https://"
              value={url}
              maxLength={2000}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={m.formEvents} required extra={m.formEventsHint}>
            <GroupedPicker
              groups={eventGroups(events)}
              describe={(code) => m.eventLabel[code] ?? ""}
              value={chosen}
              onChange={setChosen}
              searchPlaceholder={m.eventSearch}
            />
          </Form.Item>
        </Form>
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
        <Paragraph>{m.secretBody}</Paragraph>
        {secret && <SecretField hint="whsec_…" value={secret.secret} />}
      </Modal>

      <WebhookExampleDrawer
        key={examplesFor?.id ?? "closed"}
        row={examplesFor}
        onClose={() => setExamplesFor(null)}
      />

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
                  <Tag color={m.deliveryColor[status]}>
                    {m.deliveryStatus[status]}
                  </Tag>
                ),
              },
              { title: m.columnAttempts, dataIndex: "attempts", width: 70 },
              {
                title: m.columnResult,
                key: "result",
                render: (_, row) =>
                  row.last_error ??
                  (row.last_status_code ? `HTTP ${row.last_status_code}` : "—"),
              },
              {
                key: "redeliver",
                width: 80,
                render: (_, delivery) =>
                  history &&
                  (delivery.status === "sent" || delivery.status === "dead") && (
                    <Button
                      size="small"
                      disabled={!history.active}
                      onClick={() => void redeliver(history, delivery)}
                    >
                      {m.redeliver}
                    </Button>
                  ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}

/** สิ่งที่ปลายทางได้รับต่อ event ที่ subscription นี้ฟัง แล้วโค้ดตรวจลายเซ็น. */
function WebhookExampleDrawer({
  row,
  onClose,
}: {
  readonly row: WebhookRow | null;
  readonly onClose: () => void;
}) {
  const [examples, setExamples] = useState<WebhookExample[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<string | undefined>(row?.events[0]);

  useEffect(() => {
    if (!row) return;
    void getWebhookExamples(row.events).then((result) => {
      if (!result.ok) return setError(result.message);
      setExamples(result.data);
    });
  }, [row]);

  const current = examples?.find((example) => example.event === event);

  return (
    <Drawer
      open={row !== null}
      title={m.examplesTitle(row?.name ?? "")}
      size="min(900px, 100vw)"
      onClose={onClose}
    >
      {error ? (
        <Alert type="error" showIcon title={m.examplesLoadFailed} description={error} />
      ) : !examples || !row ? (
        <div className="flex h-64 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div className="space-y-3">
          <Select
            className="w-full max-w-sm"
            value={event}
            onChange={setEvent}
            options={row.events.map((code) => ({
              value: code,
              label: m.eventLabel[code] ? `${m.eventLabel[code]} · ${code}` : code,
            }))}
          />
          {current && <CodeBlock code={webhookRequestFor(current, row.url)} />}
          <div className="space-y-1 pt-2">
            <Paragraph strong className="mb-0!">
              {m.verifyTitle}
            </Paragraph>
            <Paragraph type="secondary" className="mb-0! text-xs">
              {m.verifyHint}
            </Paragraph>
          </div>
          <CodeBlock code={WEBHOOK_VERIFY_SNIPPET} />
        </div>
      )}
    </Drawer>
  );
}
