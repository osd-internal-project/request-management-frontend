"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Input, Modal, Radio, Switch, Table, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RolePermissionMatrix } from "@/components/admin/org/role-permission-matrix";
import { appApi } from "@/lib/api/client";
import type { PermissionRow, SharedRole } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.system.roles;

type Level = SharedRole["level"];

/** What a role of this level may hold — the backend refuses the rest with 422. */
function fitsLevel(level: Level, permission: PermissionRow): boolean {
  return level === "SYSTEM"
    ? permission.module === "system"
    : permission.module !== "system" && permission.type !== "service";
}

interface Draft {
  readonly id?: string;
  level: Level;
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

/** P5 — roles no company owns: templates every company may bind, and system roles. */
export function SystemRolesAdmin() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<SharedRole[] | null>(null);
  const [catalog, setCatalog] = useState<PermissionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<PermissionRow[]>("system/permissions").then((answer) => {
      if (live && answer.ok) setCatalog(answer.data);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void appApi<SharedRole[]>("system/roles").then((answer) => {
      if (!live) return;
      if (answer.ok) setRoles(answer.data);
      else setError(answer.message);
    });
    return () => {
      live = false;
    };
  }, [reload]);

  async function send(path: string, method: "POST" | "PATCH", body: unknown) {
    setBusy(true);
    setError(null);
    const answer = await appApi<SharedRole>(path, { method, body: JSON.stringify(body) });
    setBusy(false);
    if (!answer.ok) {
      setError(answer.message);
      return false;
    }
    message.success(m.saved);
    setReload((n) => n + 1);
    return true;
  }

  async function save(current: Draft) {
    const ok = current.id
      ? await send(`system/roles/${current.id}`, "PATCH", {
          name: current.name.trim(),
          description: current.description.trim(),
          permissions: current.permissions,
        })
      : await send("system/roles", "POST", {
          level: current.level,
          code: current.code.trim(),
          name: current.name.trim(),
          description: current.description.trim() || undefined,
          permissions: current.permissions,
        });
    if (ok) setDraft(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Title level={4} className="mb-0!">
            {m.title}
          </Title>
          <Text type="secondary">{m.subtitle}</Text>
        </div>
        <Button
          type="primary"
          onClick={() =>
            setDraft({ level: "COMPANY", code: "", name: "", description: "", permissions: [] })
          }
        >
          {m.create}
        </Button>
      </div>

      {error && !draft && <Alert type="error" showIcon title={error} />}

      <Card>
        <Table<SharedRole>
          rowKey="id"
          loading={!roles && !error}
          dataSource={roles ?? []}
          pagination={false}
          locale={{ emptyText: m.empty }}
          columns={[
            {
              title: m.name,
              render: (_, role) => (
                <div>
                  <div>{role.name}</div>
                  <Text type="secondary" className="text-xs">
                    {role.code}
                  </Text>
                </div>
              ),
            },
            {
              title: m.level,
              render: (_, role) =>
                role.level === "SYSTEM" ? (
                  <Tag color="blue">{m.system}</Tag>
                ) : (
                  <Tag>{m.template}</Tag>
                ),
            },
            {
              title: m.holders,
              render: (_, role) =>
                role.level === "SYSTEM" ? role._count.systemUsers : role._count.users,
            },
            {
              title: m.active,
              render: (_, role) => (
                <Switch
                  checked={role.active}
                  disabled={busy}
                  aria-label={`${m.active} ${role.code}`}
                  onChange={(active) => void send(`system/roles/${role.id}`, "PATCH", { active })}
                />
              ),
            },
            {
              key: "edit",
              align: "right",
              render: (_, role) => (
                <Button
                  onClick={() =>
                    setDraft({
                      id: role.id,
                      level: role.level,
                      code: role.code,
                      name: role.name,
                      description: role.description ?? "",
                      permissions: role.permissions.map((p) => p.permissionCode),
                    })
                  }
                >
                  {m.edit}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {draft && (
        <RoleModal
          draft={draft}
          catalog={catalog}
          busy={busy}
          error={error}
          onChange={setDraft}
          onSave={save}
          onClose={() => {
            setDraft(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

function RoleModal({
  draft,
  catalog,
  busy,
  error,
  onChange,
  onSave,
  onClose,
}: {
  readonly draft: Draft;
  readonly catalog: readonly PermissionRow[];
  readonly busy: boolean;
  readonly error: string | null;
  readonly onChange: (draft: Draft) => void;
  readonly onSave: (draft: Draft) => void;
  readonly onClose: () => void;
}) {
  const modules = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const permission of catalog) {
      if (!fitsLevel(draft.level, permission)) continue;
      grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission.code]);
    }
    return [...grouped];
  }, [catalog, draft.level]);

  const ready = draft.code.trim() && draft.name.trim() && draft.permissions.length > 0;

  return (
    <Modal
      open
      width={760}
      title={draft.id ? `${m.edit}: ${draft.name}` : m.create}
      okText={m.save}
      okButtonProps={{ disabled: !ready, loading: busy }}
      onOk={() => onSave(draft)}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-3">
        {error && <Alert type="error" showIcon title={error} />}
        <Radio.Group
          value={draft.level}
          disabled={Boolean(draft.id)}
          // Switching level empties the ticks: no code fits both levels.
          onChange={(event) =>
            onChange({ ...draft, level: event.target.value as Level, permissions: [] })
          }
          options={[
            { value: "COMPANY", label: m.template },
            { value: "SYSTEM", label: m.system },
          ]}
        />
        <Text type="secondary" className="text-xs">
          {m.levelHint}
        </Text>
        <Input
          value={draft.code}
          disabled={Boolean(draft.id)}
          placeholder={m.code}
          aria-label={m.code}
          onChange={(event) => onChange({ ...draft, code: event.target.value })}
        />
        <Input
          value={draft.name}
          placeholder={m.name}
          aria-label={m.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
        <Input.TextArea
          value={draft.description}
          placeholder={m.description}
          aria-label={m.description}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
        />
        <div className="max-h-[50vh] overflow-y-auto pr-2">
          {modules.map(([module, codes]) => (
            <RolePermissionMatrix
              key={module}
              codes={codes}
              checked={draft.permissions}
              // §5.4 is judged by the backend (422 shows above); nothing is pre-locked here.
              isForbidden={() => false}
              onToggle={(code, on) =>
                onChange({
                  ...draft,
                  permissions: on
                    ? [...draft.permissions, code]
                    : draft.permissions.filter((p) => p !== code),
                })
              }
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
