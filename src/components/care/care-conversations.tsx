"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.care;

interface Conversation {
  id: string;
  channel: string;
  senderRef: string;
  senderName: string | null;
  identification: "unknown" | "claimed" | "verified";
  verifyMethod: string | null;
  status: string;
  outcome: string | null;
  messages: number;
  openedAt: string;
  lastMessageAt: string;
  closedAt: string | null;
  textPurged: boolean;
  /** CD-282 */
  caseOffered: boolean;
  caseRequestId: string | null;
  caseOpenedAt: string | null;
}

interface Row extends Conversation {
  customer: { code: string; name: string } | null;
  lastText: string | null;
}

interface Message {
  id: string;
  direction: "in" | "out";
  author: string;
  text: string | null;
  attachments: { name: string; url?: string }[];
  at: string;
}

interface Detail {
  conversation: Conversation;
  customer: { id: string; code: string; name: string } | null;
  contact: { id: string; name: string } | null;
  assets: {
    id: string;
    name: string;
    model: string | null;
    serialNo: string | null;
    location: string | null;
    coverage: { title: string; endOn: string } | null;
  }[];
  messages: Message[];
  contacts: Contact[];
}

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

const IDENT_COLOR: Record<string, string> = {
  unknown: "default",
  claimed: "gold",
  verified: "green",
};

const STATUS_COLOR: Record<string, string> = {
  open: "blue",
  waiting_human: "orange",
  with_agent: "purple",
  closed: "default",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const methodOf = (method: string | null) =>
  method ? (m.methods[method.replace(/^remembered:/, "")] ?? method) : null;

/** CD-280 — AI CARE conversations: who wrote, on which channel, and who they are. */
export function CareConversations({ focusId }: { focusId?: string }) {
  const { message } = App.useApp();
  const [tab, setTab] = useState("live");
  const [channel, setChannel] = useState<string | undefined>();
  const [ident, setIdent] = useState<string | undefined>();
  const [version, setVersion] = useState(0);
  const [rows, setRows] = useState<{ key: string; items: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | undefined>(focusId);

  const params = new URLSearchParams({ status: tab });
  if (channel) params.set("channel", channel);
  if (ident) params.set("identification", ident);
  const key = `${params.toString()}#${version}`;

  useEffect(() => {
    let live = true;
    void appApi<Row[]>(`care/conversations?${key.split("#")[0]}`).then(
      (res) => {
        if (!live) return;
        if (res.ok) {
          setError(null);
          setRows({ key, items: res.data });
        } else setError(res.message);
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Text type="secondary">{m.hint}</Text>
      <Space wrap>
        <Segmented
          value={tab}
          onChange={(v) => setTab(String(v))}
          options={Object.entries(m.tabs).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          allowClear
          className="min-w-36"
          placeholder={m.allChannels}
          value={channel}
          onChange={setChannel}
          options={Object.entries(m.channels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          allowClear
          className="min-w-40"
          placeholder={m.allIdentification}
          value={ident}
          onChange={setIdent}
          options={Object.entries(m.identification).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Space>
      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : !rows || rows.key !== key ? (
        <Skeleton active />
      ) : !rows.items.length ? (
        <Empty description={m.none} />
      ) : (
        <Table<Row>
          rowKey="id"
          size="small"
          dataSource={rows.items}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          scroll={{ x: 900 }}
          onRow={(r) => ({
            onClick: () => setOpenId(r.id),
            className: "cursor-pointer",
          })}
          columns={[
            {
              title: m.sender,
              key: "sender",
              render: (_, r) => (
                <Space orientation="vertical" size={2}>
                  <Space size={4} wrap>
                    <Tag>{m.channels[r.channel] ?? r.channel}</Tag>
                    <Text strong>{r.senderName ?? r.senderRef}</Text>
                  </Space>
                  <Tag color={IDENT_COLOR[r.identification]}>
                    {m.identification[r.identification]}
                  </Tag>
                </Space>
              ),
            },
            {
              title: m.customer,
              key: "customer",
              width: 220,
              render: (_, r) =>
                r.customer ? `${r.customer.code} · ${r.customer.name}` : "—",
            },
            {
              title: m.lastMessage,
              key: "last",
              render: (_, r) => (
                <Space orientation="vertical" size={2}>
                  <Text className="text-xs">
                    {r.lastText ?? (r.textPurged ? m.purged : "")}
                  </Text>
                  <Text type="secondary" className="text-xs">
                    {m.messages.replace("{n}", String(r.messages))}
                  </Text>
                </Space>
              ),
            },
            {
              title: m.at,
              key: "at",
              width: 130,
              render: (_, r) => when(r.lastMessageAt),
            },
            {
              title: "",
              key: "status",
              width: 130,
              render: (_, r) => (
                <Tag color={STATUS_COLOR[r.status]}>
                  {r.status === "closed" && r.outcome
                    ? (m.outcomes[r.outcome] ?? r.outcome)
                    : m.statuses[r.status]}
                </Tag>
              ),
            },
          ]}
        />
      )}
      <ConversationDrawer
        id={openId}
        onClose={() => setOpenId(undefined)}
        onChanged={() => setVersion((v) => v + 1)}
        notify={(text) => void message.success(text)}
      />
    </Space>
  );
}

function ConversationDrawer({
  id,
  onClose,
  onChanged,
  notify,
}: {
  id?: string;
  onClose: () => void;
  onChanged: () => void;
  notify: (text: string) => void;
}) {
  const { message } = App.useApp();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<{
    customerId?: string;
    customers: { value: string; label: string }[];
    contacts: Contact[] | null;
    contactId?: string;
  } | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [opening, setOpening] = useState<{
    severity: string;
    subject: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let live = true;
    void appApi<Detail>(`care/conversations/${id}`).then((res) => {
      if (!live) return;
      if (res.ok) {
        setError(null);
        setDetail(res.data);
      } else setError(res.message);
    });
    return () => {
      live = false;
    };
  }, [id]);

  async function searchCustomers(text: string) {
    if (!verifying || text.trim().length < 2) return;
    const res = await appApi<{
      data: { id: string; customerCode: string; nameTh: string }[];
    }>(`customers?search=${encodeURIComponent(text.trim())}&page_size=20`);
    if (res.ok)
      setVerifying({
        ...verifying,
        customers: res.data.data.map((c) => ({
          value: c.id,
          label: `${c.customerCode} · ${c.nameTh}`,
        })),
      });
  }

  async function pickCustomer(customerId: string) {
    if (!verifying) return;
    setVerifying({ ...verifying, customerId, contacts: null });
    const res = await appApi<Contact[]>(
      `care/customers/${customerId}/contacts`,
    );
    setVerifying((v) =>
      v ? { ...v, customerId, contacts: res.ok ? res.data : [] } : v,
    );
  }

  function startVerify() {
    if (!detail) return;
    const known = detail.customer;
    setVerifying({
      customerId: known?.id,
      customers: known
        ? [{ value: known.id, label: `${known.code} · ${known.name}` }]
        : [],
      contacts: known ? detail.contacts : null,
    });
  }

  async function save(path: string, body: unknown, done: string) {
    if (!id) return;
    setBusy(true);
    const res = await appApi<Detail>(`care/conversations/${id}/${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    setDetail(res.data);
    setVerifying(null);
    setClosing(null);
    notify(done);
    onChanged();
  }

  async function openCase() {
    if (!id || !opening) return;
    setBusy(true);
    const res = await appApi<{ requestNo: string | null }>(
      `care/conversations/${id}/case`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(opening.severity !== "auto"
            ? { severity: opening.severity }
            : {}),
          ...(opening.subject.trim()
            ? { subject: opening.subject.trim() }
            : {}),
        }),
      },
    );
    if (!res.ok) {
      setBusy(false);
      void message.error(res.message);
      return;
    }
    const fresh = await appApi<Detail>(`care/conversations/${id}`);
    setBusy(false);
    if (fresh.ok) setDetail(fresh.data);
    setOpening(null);
    notify(m.caseOpened.replace("{n}", res.data.requestNo ?? ""));
    onChanged();
  }

  const c = detail?.conversation;
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      size="large"
      title={
        c
          ? `${m.channels[c.channel] ?? c.channel} · ${c.senderName ?? c.senderRef}`
          : ""
      }
      extra={
        c && c.status !== "closed" ? (
          <Space>
            {c.identification !== "verified" ? (
              <Button onClick={startVerify}>{m.verify}</Button>
            ) : null}
            {!c.caseRequestId ? (
              <Button
                onClick={() => setOpening({ severity: "auto", subject: "" })}
              >
                {m.openCase}
              </Button>
            ) : null}
            <Button danger onClick={() => setClosing("resolved")}>
              {m.close}
            </Button>
          </Space>
        ) : null
      }
    >
      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : !detail || detail.conversation.id !== id ? (
        <Skeleton active />
      ) : (
        <Space orientation="vertical" className="w-full" size="middle">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label={m.sender}>
              <Space wrap>
                <Text>{detail.conversation.senderRef}</Text>
                <Tag color={IDENT_COLOR[detail.conversation.identification]}>
                  {m.identification[detail.conversation.identification]}
                </Tag>
                {methodOf(detail.conversation.verifyMethod) ? (
                  <Text type="secondary" className="text-xs">
                    {methodOf(detail.conversation.verifyMethod)}
                  </Text>
                ) : null}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={m.customer}>
              {detail.customer ? (
                <Space wrap>
                  <Text>
                    {detail.customer.code} · {detail.customer.name}
                  </Text>
                  <Link href={ROUTES.customerDetail(detail.customer.id)}>
                    {m.open360}
                  </Link>
                </Space>
              ) : (
                "—"
              )}
            </Descriptions.Item>
            {detail.conversation.caseRequestId ? (
              <Descriptions.Item label={m.case}>
                <Link
                  href={ROUTES.requestDetail(detail.conversation.caseRequestId)}
                >
                  {m.viewCase}
                </Link>
              </Descriptions.Item>
            ) : detail.conversation.caseOffered ? (
              <Descriptions.Item label={m.case}>
                <Tag color="gold">{m.caseOffered}</Tag>
              </Descriptions.Item>
            ) : null}
            {detail.contact ? (
              <Descriptions.Item label={m.contact}>
                {detail.contact.name}
              </Descriptions.Item>
            ) : null}
          </Descriptions>
          {detail.conversation.identification === "claimed" ? (
            <Alert type="warning" showIcon title={m.claimedNote} />
          ) : null}
          {detail.conversation.identification === "verified" ? (
            <div>
              <Text strong className="mb-1 block">
                {m.assets}
              </Text>
              {detail.assets.length ? (
                <Space orientation="vertical" size={2} className="w-full">
                  {detail.assets.map((a) => (
                    <Text key={a.id} className="text-sm">
                      {a.name}
                      {a.model ? ` · ${a.model}` : ""}
                      {a.serialNo ? ` · ${a.serialNo}` : ""} —{" "}
                      <Text type={a.coverage ? "success" : "warning"}>
                        {a.coverage
                          ? m.coveredBy
                              .replace("{t}", a.coverage.title)
                              .replace("{d}", a.coverage.endOn)
                          : m.notCovered}
                      </Text>
                    </Text>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">{m.noAssets}</Text>
              )}
            </div>
          ) : null}
          <Space orientation="vertical" className="w-full" size={6}>
            {detail.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === "in" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.direction === "in"
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "bg-blue-50 dark:bg-blue-950"
                  }`}
                >
                  <Text type="secondary" className="block text-xs">
                    {m.authors[msg.author] ?? msg.author} · {when(msg.at)}
                  </Text>
                  <Text className="whitespace-pre-wrap">
                    {msg.text ?? m.purged}
                  </Text>
                  {msg.attachments.map((f) => (
                    <Text
                      key={f.name}
                      type="secondary"
                      className="block text-xs"
                    >
                      {m.attachment}: {f.name}
                    </Text>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        </Space>
      )}

      <Modal
        open={!!verifying}
        title={m.verifyTitle}
        onCancel={() => setVerifying(null)}
        okButtonProps={{ disabled: !verifying?.contactId }}
        confirmLoading={busy}
        onOk={() =>
          verifying?.contactId &&
          void save("verify", { contact_id: verifying.contactId }, m.verified)
        }
        destroyOnHidden
      >
        {verifying ? (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{m.verifyHint}</Text>
            <Select
              className="w-full"
              showSearch
              filterOption={false}
              onSearch={(t) => void searchCustomers(t)}
              placeholder={m.pickCustomer}
              value={verifying.customerId}
              options={verifying.customers}
              onChange={(v: string) => void pickCustomer(v)}
            />
            {verifying.customerId ? (
              verifying.contacts === null ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : verifying.contacts.length ? (
                <Select
                  className="w-full"
                  placeholder={m.pickContact}
                  value={verifying.contactId}
                  onChange={(contactId: string) =>
                    setVerifying({ ...verifying, contactId })
                  }
                  options={verifying.contacts.map((k) => ({
                    value: k.id,
                    label: [k.name, k.phone, k.email]
                      .filter(Boolean)
                      .join(" · "),
                  }))}
                />
              ) : (
                <Text type="warning">{m.noContacts}</Text>
              )
            ) : null}
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={!!opening}
        title={m.openCaseTitle}
        onCancel={() => setOpening(null)}
        confirmLoading={busy}
        onOk={() => void openCase()}
        destroyOnHidden
      >
        {opening ? (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{m.openCaseHint}</Text>
            <Select
              className="w-full"
              value={opening.severity}
              onChange={(severity: string) =>
                setOpening({ ...opening, severity })
              }
              options={Object.entries(m.severities).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              placeholder={m.caseSubject}
              maxLength={200}
              value={opening.subject}
              onChange={(e) =>
                setOpening({ ...opening, subject: e.target.value })
              }
            />
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={!!closing}
        title={m.closeTitle}
        onCancel={() => setClosing(null)}
        confirmLoading={busy}
        onOk={() =>
          closing && void save("close", { outcome: closing }, m.closed)
        }
        destroyOnHidden
      >
        <Segmented
          value={closing ?? "resolved"}
          onChange={(v) => setClosing(String(v))}
          options={["resolved", "no_reply", "spam"].map((value) => ({
            value,
            label: m.outcomes[value],
          }))}
        />
      </Modal>
    </Drawer>
  );
}
