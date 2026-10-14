"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { SearchTreeSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { buildUnitTree } from "@/lib/org/org-tree";

const m = messages.chatWidget;

interface AdminWidget {
  id: string;
  name: string;
  http_url: string | null;
  https_url: string | null;
  public_id: string | null;
  active: boolean;
  org_wide: boolean;
  is_default: boolean;
  sort_order: number;
  group_count: number;
}

interface Unit {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
  chat_count: number;
}

interface GroupSetting {
  widget_ids: string[];
  default_id: string | null;
}

interface WidgetValues {
  name: string;
  http_url: string;
  https_url: string;
  public_id: string;
  active: boolean;
  org_wide: boolean;
  sort_order: number;
}

/** An empty field passes — the "at least one URL" rule is checked on the pair. */
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

/** The PUT body for a row, with `patch` applied — the route takes whole widgets. */
function payload(row: AdminWidget, patch: Partial<AdminWidget> = {}) {
  const next = { ...row, ...patch };
  return {
    name: next.name,
    http_url: next.http_url,
    https_url: next.https_url,
    public_id: next.public_id ?? "",
    active: next.active,
    org_wide: next.org_wide,
    is_default: next.is_default,
    sort_order: next.sort_order,
  };
}

/** The chat-widget screen: the company's chats, then each unit's chats. */
export function ChatWidgetSettings() {
  const { message } = App.useApp();
  const [widgets, setWidgets] = useState<AdminWidget[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, unitList] = await Promise.all([
      appApi<AdminWidget[]>("chat-widget/widgets"),
      appApi<Unit[]>("chat-widget/org-units"),
    ]);
    if (!list.ok) {
      setError(list.message);
      return;
    }
    setWidgets(list.data);
    if (unitList.ok) setUnits(unitList.data);
    else message.error(unitList.message);
  }, [message]);

  useEffect(() => {
    // Fetch-on-mount: the setState calls land after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!widgets) {
    return (
      <div className="py-10 text-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OrgCard widgets={widgets} onChanged={load} />
      <GroupCard widgets={widgets} units={units} onChanged={load} />
    </div>
  );
}

function OrgCard({
  widgets,
  onChanged,
}: {
  widgets: AdminWidget[];
  onChanged: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<WidgetValues>();
  const [editing, setEditing] = useState<AdminWidget | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(path: string, init: RequestInit) {
    setBusy(true);
    const result = await appApi<unknown>(path, init);
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return false;
    }
    message.success(m.saved);
    await onChanged();
    return true;
  }

  const patch = (row: AdminWidget, change: Partial<AdminWidget>) =>
    send(`chat-widget/widgets/${row.id}`, {
      method: "PUT",
      body: JSON.stringify(payload(row, change)),
    });

  function open(row: AdminWidget | "new") {
    setEditing(row);
    form.setFieldsValue(
      row === "new"
        ? {
            name: "",
            http_url: "",
            https_url: "",
            public_id: "",
            active: true,
            org_wide: true,
            sort_order: widgets.length,
          }
        : {
            name: row.name,
            http_url: row.http_url ?? "",
            https_url: row.https_url ?? "",
            public_id: row.public_id ?? "",
            active: row.active,
            org_wide: row.org_wide,
            sort_order: row.sort_order,
          },
    );
  }

  async function submit(values: WidgetValues) {
    const body = {
      ...values,
      http_url: values.http_url.trim() || null,
      https_url: values.https_url.trim() || null,
      ...(editing && editing !== "new" ? { is_default: editing.is_default } : {}),
    };
    const ok =
      editing === "new"
        ? await send("chat-widget/widgets", {
            method: "POST",
            body: JSON.stringify(body),
          })
        : editing
          ? await send(`chat-widget/widgets/${editing.id}`, {
              method: "PUT",
              body: JSON.stringify(body),
            })
          : false;
    if (ok) setEditing(null);
  }

  return (
    <Card
      size="small"
      title={m.orgTitle}
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => open("new")}>
          {m.add}
        </Button>
      }
    >
      <Table<AdminWidget>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={widgets}
        columns={[
          { key: "name", title: m.name, dataIndex: "name" },
          {
            key: "url",
            title: `${m.httpUrl} / https`,
            render: (_, row) => (
              <div className="text-xs">
                <div>{row.http_url ?? "—"}</div>
                <div>{row.https_url ?? "—"}</div>
              </div>
            ),
          },
          {
            key: "active",
            title: m.active,
            render: (_, row) => (
              <Switch
                size="small"
                checked={row.active}
                disabled={busy || row.is_default}
                onChange={(active) => void patch(row, { active })}
              />
            ),
          },
          {
            key: "org_wide",
            title: m.orgWide,
            render: (_, row) => (
              <Switch
                size="small"
                checked={row.org_wide}
                disabled={busy || row.is_default}
                onChange={(orgWide) => void patch(row, { org_wide: orgWide })}
              />
            ),
          },
          {
            key: "default",
            title: m.orgDefault,
            render: (_, row) => (
              <Radio
                checked={row.is_default}
                disabled={busy || !row.active || !row.org_wide}
                onChange={() => void patch(row, { is_default: true })}
              />
            ),
          },
          {
            key: "groups",
            title: m.groups,
            render: (_, row) =>
              row.group_count ? <Tag>{m.chatCount(row.group_count)}</Tag> : "—",
          },
          { key: "sort", title: m.sortOrder, dataIndex: "sort_order" },
          {
            key: "actions",
            render: (_, row) => (
              <div className="flex gap-2">
                <Button size="small" type="link" onClick={() => open(row)}>
                  {m.edit}
                </Button>
                <Popconfirm
                  title={m.deleteConfirm}
                  onConfirm={() =>
                    void send(`chat-widget/widgets/${row.id}`, {
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
        title={editing === "new" ? m.add : m.edit}
        okText={m.save}
        cancelText={m.cancel}
        confirmLoading={busy}
        onOk={() => form.submit()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form<WidgetValues> form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="name" label={m.name} rules={[{ required: true, whitespace: true, message: m.required }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="http_url"
            label={m.httpUrl}
            extra={m.httpUrlHelp}
            dependencies={["https_url"]}
            rules={[
              schemeRule("http:", m.mustBeHttp),
              ({ getFieldValue }) => ({
                validator: (_: unknown, value: string | undefined) =>
                  value?.trim() || String(getFieldValue("https_url") ?? "").trim()
                    ? Promise.resolve()
                    : Promise.reject(new Error(m.needUrl)),
              }),
            ]}
          >
            <Input allowClear />
          </Form.Item>
          <Form.Item
            name="https_url"
            label={m.httpsUrl}
            extra={m.httpsUrlHelp}
            rules={[schemeRule("https:", m.mustBeHttps)]}
          >
            <Input allowClear />
          </Form.Item>
          <Form.Item name="public_id" label={m.publicId} rules={[{ required: true, whitespace: true, message: m.required }]}>
            <Input maxLength={100} />
          </Form.Item>
          <div className="flex flex-wrap gap-6">
            <Form.Item name="active" label={m.active} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              name="org_wide"
              label={m.orgWide}
              extra={m.orgWideHelp}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item name="sort_order" label={m.sortOrder}>
              <InputNumber min={0} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}

function GroupCard({
  widgets,
  units,
  onChanged,
}: {
  widgets: AdminWidget[];
  units: Unit[];
  onChanged: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [unitId, setUnitId] = useState<string | null>(null);
  const [setting, setSetting] = useState<GroupSetting | null>(null);
  const [busy, setBusy] = useState(false);

  const tree = useMemo(
    () =>
      buildUnitTree(units, {
        title: (unit) =>
          unit.chat_count ? `${unit.name} · ${m.chatCount(unit.chat_count)}` : unit.name,
      }),
    [units],
  );
  // Only active chats can be added; inactive ones keep their rows server-side.
  const choices = widgets.filter((widget) => widget.active);

  async function pick(id: string | null) {
    setUnitId(id);
    setSetting(null);
    if (!id) return;
    const result = await appApi<GroupSetting>(`chat-widget/groups/${id}`);
    if (result.ok) setSetting(result.data);
    else message.error(result.message);
  }

  async function save() {
    if (!unitId || !setting) return;
    setBusy(true);
    const result = await appApi<GroupSetting>(`chat-widget/groups/${unitId}`, {
      method: "PUT",
      body: JSON.stringify(setting),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setSetting(result.data);
    message.success(m.saved);
    await onChanged();
  }

  const nameOf = (id: string) => widgets.find((w) => w.id === id)?.name ?? id;

  return (
    <Card size="small" title={m.groupTitle}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.groupHint}
      </Text>
      <SearchTreeSelect
        className="w-full max-w-md"
        allowClear
        treeDefaultExpandAll
        treeData={tree}
        value={unitId ?? undefined}
        placeholder={m.pickUnit}
        onChange={(value: string | undefined) => void pick(value ?? null)}
      />
      {unitId && !setting && (
        <div className="py-4">
          <Spin size="small" />
        </div>
      )}
      {setting && (
        <div className="mt-4 max-w-2xl space-y-3">
          <div>
            <Text strong>{m.unitChats}</Text>
            <Select
              className="mt-1 w-full"
              mode="multiple"
              allowClear
              value={setting.widget_ids}
              placeholder={m.unitChatsPlaceholder}
              options={choices.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(ids: string[]) =>
                setSetting({
                  widget_ids: ids,
                  default_id:
                    setting.default_id && ids.includes(setting.default_id)
                      ? setting.default_id
                      : null,
                })
              }
            />
          </div>
          <div>
            <Text strong>{m.groupDefault}</Text>
            <Select
              className="mt-1 w-full"
              value={setting.default_id ?? ""}
              options={[
                { value: "", label: m.groupDefaultNone },
                ...setting.widget_ids.map((id) => ({ value: id, label: nameOf(id) })),
              ]}
              onChange={(id: string) =>
                setSetting({ ...setting, default_id: id || null })
              }
            />
          </div>
          <Button type="primary" loading={busy} onClick={() => void save()}>
            {m.save}
          </Button>
        </div>
      )}
    </Card>
  );
}
