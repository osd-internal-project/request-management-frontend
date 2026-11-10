"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.softphone;

interface Extension {
  id: string;
  user_id: string;
  user_name: string | null;
  username: string | null;
  extension: string;
  wss_url: string;
  sip_server: string;
  active: boolean;
  has_password: boolean;
}

interface ExtensionValues {
  user_id: string;
  extension: string;
  password: string;
  wss_url: string;
  sip_server: string;
  active: boolean;
}

interface Props {
  users: { id: string; name: string }[];
}

const wssRule = {
  validator: (_: unknown, value: string | undefined) => {
    try {
      if (new URL(value?.trim() ?? "").protocol === "wss:") {
        return Promise.resolve();
      }
    } catch {
      // Not a URL — reported with the same message as a wrong scheme.
    }
    return Promise.reject(new Error(m.mustBeWss));
  },
};

/** The company's softphone lines: one SIP extension per user. */
export function SoftphoneSettings({ users }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ExtensionValues>();
  const [rows, setRows] = useState<Extension[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Extension | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await appApi<Extension[]>("softphone/extensions");
    if (result.ok) setRows(result.data);
    else setError(result.message);
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the setState calls land after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function send(path: string, init: RequestInit) {
    setBusy(true);
    const result = await appApi<unknown>(path, init);
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return false;
    }
    message.success(m.saved);
    await load();
    return true;
  }

  function open(row: Extension | "new") {
    setEditing(row);
    // A company runs one PBX, so a new line starts from the last one's server.
    const last = rows?.at(-1);
    form.setFieldsValue(
      row === "new"
        ? {
            user_id: undefined,
            extension: "",
            password: "",
            wss_url: last?.wss_url ?? "",
            sip_server: last?.sip_server ?? "",
            active: true,
          }
        : {
            user_id: row.user_id,
            extension: row.extension,
            password: "",
            wss_url: row.wss_url,
            sip_server: row.sip_server,
            active: row.active,
          },
    );
  }

  async function submit(values: ExtensionValues) {
    const body = JSON.stringify({
      ...values,
      password: values.password?.trim() || undefined,
    });
    const ok =
      editing === "new"
        ? await send("softphone/extensions", { method: "POST", body })
        : editing
          ? await send(`softphone/extensions/${editing.id}`, {
              method: "PUT",
              body,
            })
          : false;
    if (ok) setEditing(null);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!rows) {
    return (
      <div className="py-10 text-center">
        <Spin />
      </div>
    );
  }

  const taken = new Set(rows.map((row) => row.user_id));
  const isNew = editing === "new";

  return (
    <Card
      size="small"
      title={m.listTitle}
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => open("new")}>
          {m.add}
        </Button>
      }
    >
      <Table<Extension>
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: "max-content" }}
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        columns={[
          {
            key: "user",
            title: m.user,
            render: (_, row) => (
              <div className="flex flex-col">
                <span className={row.active ? "font-medium" : "text-(--app-text-muted)"}>
                  {row.user_name ?? row.user_id}
                </span>
                {row.username && (
                  <Text type="secondary" className="text-xs">
                    {row.username}
                  </Text>
                )}
              </div>
            ),
          },
          {
            key: "extension",
            title: m.extension,
            render: (_, row) => (
              <span className="text-[15px] font-semibold tabular-nums">
                {row.extension}
              </span>
            ),
          },
          {
            key: "server",
            title: m.server,
            render: (_, row) => (
              <div className="flex flex-col">
                <Text className="text-xs">{row.sip_server}</Text>
                <Text type="secondary" className="text-xs">
                  {row.wss_url}
                </Text>
              </div>
            ),
          },
          {
            key: "password",
            title: m.password,
            render: (_, row) =>
              row.has_password ? (
                <Tag color="success">{m.passwordSet}</Tag>
              ) : (
                <Tag color="error">{m.passwordMissing}</Tag>
              ),
          },
          {
            key: "active",
            title: m.active,
            align: "center",
            render: (_, row) => (
              <Switch
                size="small"
                checked={row.active}
                disabled={busy}
                aria-label={m.active}
                onChange={(active) =>
                  void send(`softphone/extensions/${row.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      user_id: row.user_id,
                      extension: row.extension,
                      wss_url: row.wss_url,
                      sip_server: row.sip_server,
                      active,
                    }),
                  })
                }
              />
            ),
          },
          {
            key: "actions",
            render: (_, row) => (
              <div className="flex gap-1">
                <Button size="small" type="link" onClick={() => open(row)}>
                  {m.edit}
                </Button>
                <Popconfirm
                  title={m.deleteConfirm}
                  onConfirm={() =>
                    void send(`softphone/extensions/${row.id}`, {
                      method: "DELETE",
                    })
                  }
                >
                  <Button size="small" type="link" danger>
                    {m.delete}
                  </Button>
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={editing !== null}
        title={isNew ? m.add : m.edit}
        okText={m.save}
        cancelText={m.cancel}
        confirmLoading={busy}
        onOk={() => form.submit()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form<ExtensionValues> form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="user_id"
            label={m.user}
            extra={isNew ? undefined : m.userLocked}
            rules={[{ required: true, message: m.required }]}
          >
            <SearchSelect
              disabled={!isNew}
              placeholder={m.searchUser}
              options={users
                .filter((user) => !isNew || !taken.has(user.id))
                .map((user) => ({ value: user.id, label: user.name }))}
            />
          </Form.Item>
          <Form.Item
            name="extension"
            label={m.extension}
            extra={m.extensionHelp}
            rules={[{ required: true, whitespace: true, message: m.required }]}
          >
            <Input maxLength={64} inputMode="numeric" />
          </Form.Item>
          <Form.Item
            name="password"
            label={m.password}
            extra={isNew ? m.passwordHelpNew : m.passwordHelpEdit}
            rules={isNew ? [{ required: true, whitespace: true, message: m.required }] : []}
          >
            {/* new-password keeps the browser from offering to save or fill it. */}
            <Input.Password maxLength={255} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="wss_url"
            label={m.wssUrl}
            extra={m.wssUrlHelp}
            rules={[{ required: true, message: m.required }, wssRule]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item
            name="sip_server"
            label={m.sipServer}
            extra={m.sipServerHelp}
            rules={[{ required: true, whitespace: true, message: m.required }]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="active" label={m.active} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
