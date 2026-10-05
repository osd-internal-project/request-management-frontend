"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.service.assets.portal;

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  invitedAt: string;
  inviteExpires: string | null;
  lastSeenAt: string | null;
  state: string;
}

const STATE_COLOR: Record<string, string> = {
  active: "green",
  expired: "orange",
  revoked: "red",
};

/** CD-249 — who at a customer may use the portal: invite, reissue, revoke. */
export function PortalContacts({ canManage }: { readonly canManage: boolean }) {
  const { message } = App.useApp();
  const [customers, setCustomers] = useState<
    { value: string; label: string }[]
  >([]);
  const [customer, setCustomer] = useState<string | null>(null);
  const [rows, setRows] = useState<Contact[]>([]);
  const [reload, setReload] = useState(0);
  const [inviting, setInviting] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    let live = true;
    void appApi<Contact[]>(
      `service-portal/contacts?customer_id=${customer}`,
    ).then((result) => {
      if (!live) return;
      if (result.ok) setRows(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [customer, reload]);

  async function search(text: string) {
    if (text.trim().length < 2) return;
    const result = await appApi<{
      data: { id: string; customerCode: string; nameTh: string }[];
    }>(`customers?search=${encodeURIComponent(text.trim())}&page_size=20`);
    if (result.ok) {
      setCustomers(
        result.data.data.map((row) => ({
          value: row.id,
          label: `${row.customerCode} · ${row.nameTh}`,
        })),
      );
    }
  }

  async function send(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const result = await appApi<{ link?: string }>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    if (result.data.link) setLink(result.data.link);
    setReload((n) => n + 1);
    return true;
  }

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      <Space wrap className="mb-3">
        <Select
          style={{ width: 360 }}
          placeholder={m.customer}
          showSearch={{
            filterOption: false,
            onSearch: (text) => void search(text),
          }}
          value={customer ?? undefined}
          options={customers}
          onChange={(value: string) => {
            setCustomer(value);
            setLink(null);
          }}
        />
        {canManage && customer && (
          <Button
            type="primary"
            onClick={() => setInviting({ name: "", email: "", phone: "" })}
          >
            {m.invite}
          </Button>
        )}
      </Space>
      {link && (
        <div className="mb-3">
          <Text className="block text-xs">{m.link}</Text>
          <Space.Compact className="w-full">
            <Input readOnly value={link} />
            <Button
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => message.success(m.copied))
              }
            >
              {m.copy}
            </Button>
          </Space.Compact>
        </div>
      )}
      {customer && (
        <Table<Contact>
          size="small"
          rowKey="id"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 800 }}
          columns={[
            { title: m.name, dataIndex: "name" },
            {
              title: m.email,
              width: 220,
              render: (_: unknown, row) =>
                [row.email, row.phone].filter(Boolean).join(" · "),
            },
            {
              title: "",
              width: 130,
              render: (_: unknown, row) => (
                <Tag color={STATE_COLOR[row.state]}>{m.states[row.state]}</Tag>
              ),
            },
            {
              title: m.lastSeen,
              width: 140,
              render: (_: unknown, row) =>
                row.lastSeenAt
                  ? dayjs(row.lastSeenAt).format("DD/MM/YYYY HH:mm")
                  : "—",
            },
            ...(canManage
              ? [
                  {
                    title: "",
                    width: 220,
                    render: (_: unknown, row: Contact) => (
                      <Space>
                        <Popconfirm
                          title={m.reinviteHint}
                          onConfirm={() =>
                            void send(
                              `service-portal/contacts/${row.id}/invite`,
                            )
                          }
                        >
                          <Button size="small">{m.reinvite}</Button>
                        </Popconfirm>
                        {row.state !== "revoked" && (
                          <Popconfirm
                            title={m.revokeHint}
                            onConfirm={() =>
                              void send(
                                `service-portal/contacts/${row.id}/revoke`,
                              )
                            }
                          >
                            <Button size="small" danger>
                              {m.revoke}
                            </Button>
                          </Popconfirm>
                        )}
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
      <Modal
        open={inviting !== null}
        title={m.invite}
        onCancel={() => setInviting(null)}
        okText={m.save}
        cancelText={m.close}
        confirmLoading={busy}
        okButtonProps={{ disabled: !inviting?.name.trim() }}
        onOk={() =>
          void send("service-portal/contacts", {
            customer_id: customer,
            name: inviting?.name,
            ...(inviting?.email.trim() ? { email: inviting.email.trim() } : {}),
            ...(inviting?.phone.trim() ? { phone: inviting.phone.trim() } : {}),
          }).then((ok) => ok && setInviting(null))
        }
        destroyOnHidden
      >
        {inviting && (
          <div className="space-y-3">
            {(["name", "email", "phone"] as const).map((field) => (
              <label key={field} className="block text-xs">
                {m[field]}
                <Input
                  maxLength={field === "name" ? 200 : 255}
                  value={inviting[field]}
                  onChange={(event) =>
                    setInviting({ ...inviting, [field]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
        )}
      </Modal>
    </Card>
  );
}
