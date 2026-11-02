"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  createAssignmentRule,
  listAssignmentHistory,
  listAssignmentRoles,
  listAssignmentRules,
  previewAssignment,
  updateAssignmentRole,
  updateAssignmentRule,
  type AssignmentHistoryRow,
  type AssignmentRoleSetting,
  type AssignmentRoleSpec,
  type AssignmentRule,
} from "@/lib/api/assignment-rules";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.assignmentRules;

/** Roles whose open work is counted from requests of chosen types. */
const REQUEST_LOAD_ROLES = new Set(["presales", "pricing", "legal", "support"]);

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.reason).join("; "),
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

interface Props {
  units: { id: string; name: string; memberCount: number }[];
  users: { id: string; name: string }[];
}

/**
 * ตารางทีม (`admin.org.manage`) — ต่อบทบาท: กฎ (เงื่อนไข → ทีมจากผังองค์กร),
 * คนรับสำรอง, ประเภทคำขอที่นับงานเปิด, ลองจับคู่ และการจัดคนล่าสุด.
 */
export function AssignmentRulesAdmin({ units, users }: Props) {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<AssignmentRoleSpec[]>([]);
  const [rules, setRules] = useState<AssignmentRule[] | null>(null);
  const [settings, setSettings] = useState<AssignmentRoleSetting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("sales");
  const [history, setHistory] = useState<AssignmentHistoryRow[] | null>(null);

  const unitName = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.name])),
    [units],
  );
  const userName = useMemo(
    () => new Map(users.map((user) => [user.id, user.name])),
    [users],
  );

  const refresh = useCallback(
    () =>
      listAssignmentRules().then((result) => {
        if (result.ok) {
          setRules(result.data.rules);
          setSettings(result.data.roles);
        } else setError(result.message);
      }),
    [],
  );

  useEffect(() => {
    void refresh();
    void listAssignmentRoles().then((result) => {
      if (result.ok) setRoles(result.data);
      else setError(result.message);
    });
  }, [refresh]);

  useEffect(() => {
    void listAssignmentHistory(role).then((result) => {
      setHistory(result.ok ? result.data : []);
    });
  }, [role]);

  function switchRole(next: string) {
    setHistory(null);
    setRole(next);
  }

  if (error) {
    return (
      <Alert type="error" showIcon title={m.loadFailed} description={error} />
    );
  }

  if (!rules || !roles.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  const spec = roles.find((r) => r.key === role) ?? roles[0];

  return (
    <Tabs
      activeKey={role}
      onChange={switchRole}
      items={roles.map((r) => ({
        key: r.key,
        label: r.label,
        children:
          r.key === role ? (
            <RolePanel
              spec={spec}
              rules={rules.filter((rule) => rule.role === spec.key)}
              setting={settings.find((s) => s.role === spec.key)}
              history={history}
              units={units}
              users={users}
              unitName={unitName}
              userName={userName}
              onChanged={refresh}
              notify={message}
            />
          ) : null,
      }))}
    />
  );
}

interface PanelProps {
  spec: AssignmentRoleSpec;
  rules: AssignmentRule[];
  setting: AssignmentRoleSetting | undefined;
  history: AssignmentHistoryRow[] | null;
  units: Props["units"];
  users: Props["users"];
  unitName: Map<string, string>;
  userName: Map<string, string>;
  onChanged: () => Promise<void>;
  notify: ReturnType<typeof App.useApp>["message"];
}

function RolePanel({
  spec,
  rules,
  setting,
  history,
  units,
  users,
  unitName,
  userName,
  onChanged,
  notify,
}: PanelProps) {
  /** null = closed; "new" = adding; a rule = editing it. */
  const [form, setForm] = useState<AssignmentRule | "new" | null>(null);
  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState(0);
  const [conditions, setConditions] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [criteria, setCriteria] = useState<Record<string, string>>({});
  const [previewText, setPreviewText] = useState<string | null>(null);

  const fieldLabel = new Map(spec.fields.map((f) => [f.key, f.label]));

  function open(rule: AssignmentRule | "new") {
    const isNew = rule === "new";
    setName(isNew ? "" : rule.name);
    setUnitId(isNew ? undefined : rule.org_unit_id);
    setSortOrder(
      isNew
        ? (rules.reduce((max, r) => Math.max(max, r.sort_order), 0) || 0) + 10
        : rule.sort_order,
    );
    setConditions(isNew ? {} : { ...rule.conditions });
    setForm(rule);
  }

  async function save() {
    if (form === null || !unitId || !name.trim()) return;
    setBusy(true);
    const payload = {
      name: name.trim(),
      org_unit_id: unitId,
      sort_order: sortOrder,
      conditions,
    };
    const result =
      form === "new"
        ? await createAssignmentRule({ role: spec.key, ...payload })
        : await updateAssignmentRule(form.id, payload);
    setBusy(false);
    if (!result.ok) return void notify.error(errorText(result));
    notify.success(m.saved);
    setForm(null);
    await onChanged();
  }

  async function toggle(rule: AssignmentRule) {
    const result = await updateAssignmentRule(rule.id, { active: !rule.active });
    if (!result.ok) return void notify.error(errorText(result));
    await onChanged();
  }

  async function saveRole(payload: {
    fallback_user_id?: string | null;
    load_type_codes?: string[];
  }) {
    const result = await updateAssignmentRole(spec.key, payload);
    if (!result.ok) return void notify.error(errorText(result));
    notify.success(m.saved);
    await onChanged();
  }

  async function runPreview() {
    const result = await previewAssignment(spec.key, criteria);
    if (!result.ok) {
      setPreviewText(null);
      return void notify.error(errorText(result));
    }
    setPreviewText(
      m.previewResult(
        result.data.user_name,
        m.reason[result.data.reason] ?? result.data.reason,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        size="small"
        title={spec.label}
        extra={
          <Button type="primary" onClick={() => open("new")}>
            {m.add}
          </Button>
        }
      >
        <Table<AssignmentRule>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={rules}
          locale={{ emptyText: m.empty }}
          columns={[
            { title: m.columnOrder, dataIndex: "sort_order", width: 70 },
            { title: m.columnName, dataIndex: "name" },
            {
              title: m.columnConditions,
              render: (_, rule) => {
                const entries = Object.entries(rule.conditions);
                if (!entries.length) return <Tag>{m.anyWork}</Tag>;
                return (
                  <Space size={[4, 4]} wrap>
                    {entries.map(([key, values]) => (
                      <Tag key={key}>
                        {fieldLabel.get(key) ?? key}: {values.join(", ")}
                      </Tag>
                    ))}
                  </Space>
                );
              },
            },
            {
              title: m.columnTeam,
              render: (_, rule) =>
                unitName.get(rule.org_unit_id) ?? rule.org_unit_id,
            },
            {
              title: m.columnStatus,
              width: 90,
              render: (_, rule) =>
                rule.active ? (
                  <Tag color="green">{m.active}</Tag>
                ) : (
                  <Tag>{m.inactive}</Tag>
                ),
            },
            {
              width: 150,
              render: (_, rule) => (
                <Space size={4}>
                  <Button size="small" onClick={() => open(rule)}>
                    {m.edit}
                  </Button>
                  <Button size="small" onClick={() => void toggle(rule)}>
                    {rule.active ? m.deactivate : m.activate}
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title={m.roleSettings}>
        <Form layout="vertical" className="max-w-xl">
          <Form.Item label={m.fallback} extra={m.fallbackHint}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              value={setting?.fallback_user_id ?? undefined}
              options={users.map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              onChange={(value?: string) =>
                void saveRole({ fallback_user_id: value ?? null })
              }
            />
          </Form.Item>
          {REQUEST_LOAD_ROLES.has(spec.key) && (
            <Form.Item label={m.loadTypes} extra={m.loadTypesHint}>
              <Select
                mode="tags"
                value={setting?.load_type_codes ?? []}
                placeholder={m.valuesPlaceholder}
                onChange={(codes: string[]) =>
                  void saveRole({ load_type_codes: codes })
                }
              />
            </Form.Item>
          )}
        </Form>
      </Card>

      <Card size="small" title={m.preview}>
        <Space wrap>
          {spec.fields.map((field) => (
            <Input
              key={field.key}
              placeholder={field.label}
              style={{ width: 180 }}
              value={criteria[field.key] ?? ""}
              onChange={(event) =>
                setCriteria({ ...criteria, [field.key]: event.target.value })
              }
            />
          ))}
          <Button onClick={() => void runPreview()}>{m.previewRun}</Button>
        </Space>
        {previewText && (
          <div className="mt-2">
            <Text strong>{previewText}</Text>
          </div>
        )}
      </Card>

      <Card size="small" title={m.history}>
        <Table<AssignmentHistoryRow>
          size="small"
          rowKey="id"
          loading={history === null}
          dataSource={history ?? []}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: m.noHistory }}
          columns={[
            {
              title: m.columnWhen,
              width: 150,
              render: (_, row) => dateTime(row.created_at),
            },
            {
              title: m.columnResource,
              render: (_, row) => `${row.resource_type} ${row.resource_id}`,
            },
            {
              title: m.columnPerson,
              render: (_, row) => userName.get(row.user_id) ?? row.user_id,
            },
            {
              title: m.columnReason,
              width: 120,
              render: (_, row) => m.reason[row.reason] ?? row.reason,
            },
          ]}
        />
      </Card>

      <Drawer
        open={form !== null}
        onClose={() => setForm(null)}
        title={form === "new" ? m.add : m.edit}
        width={480}
        extra={
          <Button
            type="primary"
            loading={busy}
            disabled={!unitId || !name.trim()}
            onClick={() => void save()}
          >
            {m.save}
          </Button>
        }
      >
        <Form layout="vertical">
          <Form.Item label={m.name} required>
            <Input
              value={name}
              maxLength={120}
              placeholder={m.namePlaceholder}
              onChange={(event) => setName(event.target.value)}
            />
          </Form.Item>
          <Form.Item label={m.team} required>
            <Select
              showSearch
              optionFilterProp="label"
              value={unitId}
              onChange={setUnitId}
              options={units.map((unit) => ({
                value: unit.id,
                label: `${unit.name} (${unit.memberCount})`,
              }))}
            />
          </Form.Item>
          <Form.Item label={m.sortOrder}>
            <InputNumber
              min={0}
              max={100000}
              value={sortOrder}
              onChange={(value) => setSortOrder(value ?? 0)}
            />
          </Form.Item>
          <Text type="secondary" className="mb-3 block text-xs">
            {m.conditionsHint}
          </Text>
          {spec.fields.map((field) => (
            <Form.Item key={field.key} label={field.label}>
              <Select
                mode="tags"
                value={conditions[field.key] ?? []}
                placeholder={m.valuesPlaceholder}
                onChange={(values: string[]) =>
                  setConditions({ ...conditions, [field.key]: values })
                }
              />
            </Form.Item>
          ))}
        </Form>
      </Drawer>
    </div>
  );
}
