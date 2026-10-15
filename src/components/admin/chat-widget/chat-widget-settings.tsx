"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { buildUnitTree, type UnitTreeNode } from "@/lib/org/org-tree";

const m = messages.chatWidget;
const unitKinds: Record<string, string> = messages.org.unitKinds;

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
}

interface GroupRow {
  org_unit_id: string;
  widget_ids: string[];
  default_id: string | null;
}

type GroupDraft = Omit<GroupRow, "org_unit_id">;

interface WidgetValues {
  name: string;
  http_url: string;
  https_url: string;
  public_id: string;
  active: boolean;
  org_wide: boolean;
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

/** The chat-widget screen: the company's chats, then the unit × chat matrix. */
export function ChatWidgetSettings() {
  const { message } = App.useApp();
  const [widgets, setWidgets] = useState<AdminWidget[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, unitList, groupList] = await Promise.all([
      appApi<AdminWidget[]>("chat-widget/widgets"),
      appApi<Unit[]>("chat-widget/org-units"),
      appApi<GroupRow[]>("chat-widget/groups"),
    ]);
    if (!list.ok) {
      setError(list.message);
      return;
    }
    setWidgets(list.data);
    if (unitList.ok) setUnits(unitList.data);
    else message.error(unitList.message);
    if (groupList.ok) setGroups(groupList.data);
    else message.error(groupList.message);
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
      <GroupMatrix
        widgets={widgets}
        units={units}
        groups={groups}
        onSaved={(rows) => {
          setGroups(rows);
          void load();
        }}
      />
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

  function move(index: number, step: -1 | 1) {
    const ids = widgets.map((widget) => widget.id);
    const target = index + step;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void send("chat-widget/order", {
      method: "PUT",
      body: JSON.stringify({ ids }),
    });
  }

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
          }
        : {
            name: row.name,
            http_url: row.http_url ?? "",
            https_url: row.https_url ?? "",
            public_id: row.public_id ?? "",
            active: row.active,
            org_wide: row.org_wide,
          },
    );
  }

  async function submit(values: WidgetValues) {
    const body = {
      ...values,
      http_url: values.http_url.trim() || null,
      https_url: values.https_url.trim() || null,
      // A new chat goes last; an edit keeps its place and default flag.
      ...(editing && editing !== "new"
        ? { is_default: editing.is_default, sort_order: editing.sort_order }
        : { sort_order: widgets.length }),
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
        scroll={{ x: "max-content" }}
        dataSource={widgets}
        columns={[
          {
            key: "order",
            title: m.sortOrder,
            width: 80,
            render: (_, _row, index) => (
              <div className="flex gap-1">
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  aria-label={m.moveUp}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  aria-label={m.moveDown}
                  disabled={busy || index === widgets.length - 1}
                  onClick={() => move(index, 1)}
                />
              </div>
            ),
          },
          {
            key: "name",
            title: m.name,
            render: (_, row) => (
              <div className="flex flex-wrap items-center gap-1">
                <span className={row.active ? "font-medium" : "text-[var(--app-text-muted)]"}>
                  {row.name}
                </span>
                {row.is_default && <Tag color="blue">{m.orgDefault}</Tag>}
                {!row.active && <Tag>{m.inactiveTag}</Tag>}
                {row.active && !row.org_wide && <Tag color="purple">{m.unitsOnlyTag}</Tag>}
              </div>
            ),
          },
          {
            key: "http",
            title: "http",
            render: (_, row) => <Text className="text-xs">{row.http_url ?? "—"}</Text>,
          },
          {
            key: "https",
            title: "https",
            render: (_, row) => <Text className="text-xs">{row.https_url ?? "—"}</Text>,
          },
          {
            key: "active",
            title: m.active,
            align: "center",
            render: (_, row) => (
              <Tooltip title={row.is_default ? m.defaultLocked : undefined}>
                <Switch
                  size="small"
                  checked={row.active}
                  disabled={busy || row.is_default}
                  onChange={(active) => void patch(row, { active })}
                />
              </Tooltip>
            ),
          },
          {
            key: "org_wide",
            title: m.orgWide,
            align: "center",
            render: (_, row) => (
              <Tooltip title={row.is_default ? m.defaultLocked : undefined}>
                <Switch
                  size="small"
                  checked={row.org_wide}
                  disabled={busy || row.is_default}
                  onChange={(orgWide) => void patch(row, { org_wide: orgWide })}
                />
              </Tooltip>
            ),
          },
          {
            key: "default",
            title: m.orgDefault,
            align: "center",
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
            align: "center",
            render: (_, row) => (row.group_count ? m.chatUnits(row.group_count) : "—"),
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
                    void send(`chat-widget/widgets/${row.id}`, { method: "DELETE" })
                  }
                >
                  <Button size="small" type="link" danger disabled={row.is_default}>
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
          <Form.Item
            name="name"
            label={m.name}
            rules={[{ required: true, whitespace: true, message: m.required }]}
          >
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
          <Form.Item
            name="public_id"
            label={m.publicId}
            rules={[{ required: true, whitespace: true, message: m.required }]}
          >
            {/* Masked on screen; new-password keeps the browser from offering to save it. */}
            <Input.Password maxLength={100} autoComplete="new-password" />
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
          </div>
        </Form>
      </Modal>
    </Card>
  );
}

interface MatrixRow {
  id: string;
  name: string;
  kind: string;
  depth: number;
}

/** The unit tree flattened in chart order, each row knowing how deep it sits. */
function flatten(nodes: UnitTreeNode[], kindOf: Map<string, Unit>, depth = 0): MatrixRow[] {
  return nodes.flatMap((node) => [
    {
      id: node.value,
      name: node.title,
      kind: kindOf.get(node.value)?.kind ?? "",
      depth,
    },
    ...flatten(node.children, kindOf, depth + 1),
  ]);
}

const sameDraft = (a: GroupDraft, b: GroupDraft) =>
  a.default_id === b.default_id &&
  a.widget_ids.length === b.widget_ids.length &&
  a.widget_ids.every((id) => b.widget_ids.includes(id));

const EMPTY: GroupDraft = { widget_ids: [], default_id: null };

/**
 * Units down the side, active chats across the top: tick a chat to add it to
 * a unit (and its subtree), pick the unit's default. Changes are drafts until
 * "save" sends the changed rows together.
 */
function GroupMatrix({
  widgets,
  units,
  groups,
  onSaved,
}: {
  widgets: AdminWidget[];
  units: Unit[];
  groups: GroupRow[];
  onSaved: (rows: GroupRow[]) => void;
}) {
  const { message } = App.useApp();
  const [drafts, setDrafts] = useState<Map<string, GroupDraft>>(new Map());
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [onlyConfigured, setOnlyConfigured] = useState(false);
  const [busy, setBusy] = useState(false);

  const saved = useMemo(
    () => new Map(groups.map((row) => [row.org_unit_id, row])),
    [groups],
  );
  const rows = useMemo(
    () => flatten(buildUnitTree(units), new Map(units.map((u) => [u.id, u]))),
    [units],
  );
  const chats = widgets.filter((widget) => widget.active);
  const current = (unitId: string): GroupDraft =>
    drafts.get(unitId) ?? saved.get(unitId) ?? EMPTY;

  const visible = rows.filter((row) => {
    if (search && !row.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (kind && row.kind !== kind) return false;
    if (onlyConfigured && !current(row.id).widget_ids.length) return false;
    return true;
  });
  const kinds = [...new Set(units.map((unit) => unit.kind))];

  function setDraft(unitId: string, next: GroupDraft) {
    setDrafts((prev) => {
      const copy = new Map(prev);
      if (sameDraft(next, saved.get(unitId) ?? EMPTY)) copy.delete(unitId);
      else copy.set(unitId, next);
      return copy;
    });
  }

  function toggle(unitId: string, widgetId: string, checked: boolean) {
    const draft = current(unitId);
    const ids = checked
      ? [...draft.widget_ids, widgetId]
      : draft.widget_ids.filter((id) => id !== widgetId);
    setDraft(unitId, {
      widget_ids: ids,
      default_id: draft.default_id && ids.includes(draft.default_id) ? draft.default_id : null,
    });
  }

  async function save() {
    setBusy(true);
    const result = await appApi<GroupRow[]>("chat-widget/groups", {
      method: "PUT",
      body: JSON.stringify({
        groups: [...drafts].map(([orgUnitId, draft]) => ({
          org_unit_id: orgUnitId,
          ...draft,
        })),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setDrafts(new Map());
    message.success(m.saved);
    onSaved(result.data);
  }

  return (
    <Card
      size="small"
      title={m.groupTitle}
      extra={
        <div className="flex gap-2">
          <Button size="small" disabled={!drafts.size || busy} onClick={() => setDrafts(new Map())}>
            {m.cancel}
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={!drafts.size}
            loading={busy}
            onClick={() => void save()}
          >
            {m.saveChanges(drafts.size)}
          </Button>
        </div>
      }
    >
      <Text type="secondary" className="mb-3 block text-xs">
        {m.groupHint}
      </Text>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input.Search
          allowClear
          className="max-w-xs"
          placeholder={m.searchUnit}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          allowClear
          className="w-40"
          placeholder={m.unitKind}
          value={kind ?? undefined}
          onChange={(value: string | undefined) => setKind(value ?? null)}
          options={kinds.map((value) => ({ value, label: unitKinds[value] ?? value }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch size="small" checked={onlyConfigured} onChange={setOnlyConfigured} />
          {m.onlyConfigured}
        </label>
      </div>
      {chats.length === 0 ? (
        <Text type="secondary">{m.noActiveChats}</Text>
      ) : (
        <Table<MatrixRow>
          rowKey="id"
          size="small"
          sticky
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          dataSource={visible}
          rowClassName={(row) => (drafts.has(row.id) ? "bg-amber-50" : "")}
          columns={[
            {
              key: "unit",
              title: m.groups,
              fixed: "left",
              render: (_, row) => (
                <div style={{ paddingLeft: search ? 0 : row.depth * 16 }} className="flex items-center gap-2">
                  <span>{row.name}</span>
                  <Text type="secondary" className="text-xs">
                    {unitKinds[row.kind] ?? row.kind}
                  </Text>
                </div>
              ),
            },
            ...chats.map((chat) => ({
              key: chat.id,
              align: "center" as const,
              title: (
                <div className="flex flex-col items-center leading-tight">
                  <span>{chat.name}</span>
                  {chat.org_wide && (
                    <Text type="secondary" className="text-[11px]">
                      {m.orgWide}
                    </Text>
                  )}
                </div>
              ),
              render: (_: unknown, row: MatrixRow) => (
                <Checkbox
                  aria-label={`${row.name} · ${chat.name}`}
                  checked={current(row.id).widget_ids.includes(chat.id)}
                  onChange={(event) => toggle(row.id, chat.id, event.target.checked)}
                />
              ),
            })),
            {
              key: "default",
              title: m.groupDefault,
              render: (_, row) => {
                const draft = current(row.id);
                return (
                  <Select
                    size="small"
                    className="w-40"
                    disabled={!draft.widget_ids.length}
                    value={draft.default_id ?? ""}
                    onChange={(id: string) =>
                      setDraft(row.id, { ...draft, default_id: id || null })
                    }
                    options={[
                      { value: "", label: m.groupDefaultNone },
                      ...chats
                        .filter((chat) => draft.widget_ids.includes(chat.id))
                        .map((chat) => ({ value: chat.id, label: chat.name })),
                    ]}
                  />
                );
              },
            },
          ]}
        />
      )}
    </Card>
  );
}
