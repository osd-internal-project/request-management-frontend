"use client";

import { useRef, useState } from "react";
import { Alert, App, Button, Card, Checkbox, Empty, Input, Modal, Space, Spin, Tag, Tooltip } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import {
  createRole,
  fetchRoleAudit,
  fetchRoleHolders,
  grantRole,
  revokeRole,
  searchUsers,
  updateRole,
} from "@/lib/api/client-roles";
import type {
  AuditLogRow,
  KeycloakRoleMappingRow,
  OrgUnitNode,
  PermissionRow,
  RoleHolder,
  RoleRow,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ORG_UNIT_LEVELS } from "@/lib/org-levels";
import { SearchSelect } from "./search-select";

/**
 * §5.4 guardrail 1 — the permissions a role holding `admin.*` may not have.
 *
 * Mirrored here only to grey out the boxes and say why. The rule is enforced
 * by the backend (`assertSeparationOfDuties`), which answers 422 to a direct
 * API call; this constant going stale would make the screen misleading, never
 * unsafe.
 */
const FORBIDDEN_WITH_ADMIN = ["approval.decide", "request.sensitive.read"];

/**
 * The levels a role's view may start at, widest first — the chart's five, in
 * chart order rather than the enum's declaration order, which puts ทีม last.
 */
const VISIBILITY_LEVELS: readonly OrgUnitNode["kind"][] = ORG_UNIT_LEVELS;

/** The three columns §16 A4 draws, by permission module. */
const GROUPS = [
  { key: "request", modules: ["request"], label: messages.roleAdmin.groups.request },
  {
    key: "approvalReport",
    modules: ["approval", "report", "user"],
    label: messages.roleAdmin.groups.approvalReport,
  },
  {
    key: "adminAudit",
    modules: ["admin", "audit"],
    label: messages.roleAdmin.groups.adminAudit,
  },
] as const;

function thaiFor(code: string): string {
  return messages.roleAdmin.permission[code] ?? "";
}

/** `23 ส.ค.` — the date form §16 A4 uses in its change list. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

interface Props {
  readonly roles: RoleRow[];
  readonly permissions: PermissionRow[];
  readonly mappings: KeycloakRoleMappingRow[];
  readonly companyName: string;
  readonly companyId: string;
  readonly initialHolders: RoleHolder[];
  readonly initialAudit: AuditLogRow[];
}

/**
 * Screen §16 A4 — Role และ Permission.
 *
 * The division of labour this screen exists to make visible: **who** is in a
 * role is decided in Keycloak (ROLE-03), **what** the role may do is decided
 * here. Getting that backwards is the mistake the banner and the badges are
 * there to prevent — an admin who unbinds someone here would find them back
 * on their next login.
 */
export function RolePermissionAdmin({
  roles: initialRoles,
  permissions,
  mappings,
  companyName,
  companyId,
  initialHolders,
  initialAudit,
}: Props) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [roles, setRoles] = useState(initialRoles);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRoles[0]?.id ?? null,
  );
  const [checked, setChecked] = useState<string[]>(
    initialRoles[0]?.permissions.map((p) => p.permissionCode) ?? [],
  );
  const [level, setLevel] = useState<OrgUnitNode["kind"] | null>(
    initialRoles[0]?.visibilityLevel ?? null,
  );
  const [holders, setHolders] = useState(initialHolders);
  const [audit, setAudit] = useState(initialAudit);
  const [panelsLoading, setPanelsLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  /**
   * The role the newest click asked for.
   *
   * A ref rather than the state above because `refreshPanels` closes over the
   * value it read when it started, and the whole point is to compare against
   * what is current when it finishes.
   */
  const selectedIdRef = useRef<string | null>(initialRoles[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [binding, setBinding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = roles.find((role) => role.id === selectedId) ?? null;
  const holdsAdmin = checked.some((code) => code.startsWith("admin."));

  function mappedRole(roleId: string): string | null {
    return (
      mappings.find((mapping) => mapping.roleId === roleId)?.keycloakRole ?? null
    );
  }

  async function select(role: RoleRow) {
    setSelectedId(role.id);
    selectedIdRef.current = role.id;
    setChecked(role.permissions.map((p) => p.permissionCode));
    setLevel(role.visibilityLevel);
    setError(null);

    await refreshPanels(role.id);
  }

  /**
   * Holders and history belong to one role, so they are fetched on the click
   * rather than pre-loaded for every row — the left list grows with each role
   * an admin adds, and only one panel is ever on screen.
   *
   * A failure is **said**, not swallowed. Leaving the previous panel in place
   * silently is worse than an empty one: the heading names the role that was
   * just clicked while the list underneath still belongs to the last one, so
   * the screen reads as "these people hold this role" and is wrong.
   */
  async function refreshPanels(roleId: string) {
    setPanelsLoading(true);

    const [holderResult, auditResult] = await Promise.all([
      fetchRoleHolders(roleId),
      fetchRoleAudit(roleId),
    ]);

    setPanelsLoading(false);

    // Only the newest click may write. Clicking down the list faster than the
    // network answers is normal, and a slow response for a role the admin has
    // already left must not be painted over the newer one.
    if (roleId !== selectedIdRef.current) return;

    if (holderResult.ok) {
      setHolders(holderResult.data);
      setPanelError(null);
    } else {
      setHolders([]);
      setPanelError(holderResult.message);
    }

    if (auditResult.ok) setAudit(auditResult.data.data);
    else setAudit([]);
  }

  function toggle(code: string, on: boolean) {
    setChecked((current) =>
      on ? [...current, code] : current.filter((entry) => entry !== code),
    );
  }

  async function save() {
    if (!selected) return;

    setBusy(true);
    setError(null);

    /*
      The level goes with the permissions, always — this panel is the one place
      that shows it, so what is on screen is what the role should end up with.
      `null` clears it, which is why it is sent rather than omitted.
    */
    const result = await updateRole(selected.id, {
      permissions: checked,
      visibility_level: level,
    });

    if (result.ok) {
      setRoles((current) =>
        current.map((role) =>
          role.id === selected.id
            ? {
                ...role,
                permissions: checked.map((code) => ({ permissionCode: code })),
                visibilityLevel: level,
              }
            : role,
        ),
      );
      void message.success(messages.roleAdmin.saved);
      await refreshPanels(selected.id);
    } else setError(result.message);

    setBusy(false);
  }

  async function toggleActive() {
    if (!selected) return;

    setBusy(true);
    const result = await updateRole(selected.id, { active: !selected.active });

    if (result.ok) {
      setRoles((current) =>
        current.map((role) =>
          role.id === selected.id ? { ...role, active: !role.active } : role,
        ),
      );
    } else setError(result.message);

    setBusy(false);
  }

  async function revoke(holder: RoleHolder) {
    if (!selected) return;

    setBusy(true);
    const result = await revokeRole(holder.userId, selected.id);

    if (result.ok) {
      setHolders((current) =>
        current.filter((entry) => entry.userId !== holder.userId),
      );
      setRoles((current) =>
        current.map((role) =>
          role.id === selected.id
            ? { ...role, _count: { users: Math.max(role._count.users - 1, 0) } }
            : role,
        ),
      );
      void message.success(messages.roleAdmin.revoked);
      await refreshPanels(selected.id);
    } else setError(result.message);

    setBusy(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)]">
      <Card
        title={messages.roleAdmin.listTitle(roles.length)}
        extra={
          <Button size="small" onClick={() => setCreating(true)}>
            {messages.roleAdmin.newRole}
          </Button>
        }
      >
        {roles.length ? (
          <ul className="divide-y divide-black/5">
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  onClick={() => void select(role)}
                  className={`w-full cursor-pointer rounded px-2 py-2 text-left hover:bg-black/5 ${
                    role.id === selectedId ? "bg-black/5 font-medium" : ""
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{role.name}</span>
                    {!role.isSystem || !role.active ? (
                      <Tag color={role.active ? "green" : "default"}>
                        {role.active
                          ? messages.roleAdmin.active
                          : messages.roleAdmin.inactive}
                      </Tag>
                    ) : null}
                  </span>
                  <Text type="secondary" className="block text-xs">
                    {role.code === "employee"
                      ? messages.roleAdmin.everyone
                      : `${messages.roleAdmin.holders(role._count.users)} · ${
                          mappedRole(role.id)
                            ? messages.roleAdmin.mappedFrom(
                                mappedRole(role.id) as string,
                              )
                            : messages.roleAdmin.unmapped
                        }`}
                  </Text>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Card>

      <Card
        title={
          selected ? (
            <span className="flex flex-wrap items-center gap-2">
              {messages.roleAdmin.edit(selected.name)}
              <Tag>{messages.roleAdmin.company(companyName)}</Tag>
            </span>
          ) : (
            messages.roleAdmin.selectFirst
          )
        }
        extra={
          selected && (
            <Space size="small" wrap>
              <Tooltip title={messages.roleAdmin.deletableNote}>
                <Tag>
                  {messages.roleAdmin.undeletable(selected._count.users)}
                </Tag>
              </Tooltip>
              <Button size="small" onClick={() => void toggleActive()}>
                {selected.active
                  ? messages.roleAdmin.disable
                  : messages.roleAdmin.enable}
              </Button>
              <Button
                size="small"
                type="primary"
                loading={busy}
                onClick={() => void save()}
              >
                {messages.roleAdmin.save}
              </Button>
            </Space>
          )
        }
      >
        {!selected ? (
          <Empty description={messages.roleAdmin.selectFirst} />
        ) : (
          <Space orientation="vertical" size="middle" className="flex">
            {error && <Alert type="error" showIcon title={error} />}

            <Alert
              type="info"
              showIcon
              title={messages.roleAdmin.membershipNote(
                mappedRole(selected.id),
              )}
            />

            <div>
              <Text strong className="text-xs tracking-wide">
                {messages.roleAdmin.visibilityLevel}
              </Text>

              <div className="mt-2">
                <SearchSelect
                  value={level}
                  onChange={(value?: OrgUnitNode["kind"]) =>
                    setLevel(value ?? null)
                  }
                  allowClear
                  style={{ width: 260 }}
                  placeholder={messages.roleAdmin.visibilityLevelNone}
                  options={VISIBILITY_LEVELS.map((value) => ({
                    value,
                    label: messages.roleAdmin.visibilityLevelOf(
                      messages.org.unitKinds[value],
                    ),
                  }))}
                />
              </div>

              <Paragraph type="secondary" className="mt-2! mb-0! text-xs">
                {messages.roleAdmin.visibilityLevelHint}
              </Paragraph>

              {level && (
                <Paragraph type="secondary" className="mt-1! mb-0! text-xs">
                  {messages.roleAdmin.visibilityLevelUnreachable}
                </Paragraph>
              )}
            </div>

            {GROUPS.map((group) => {
              const rows = permissions.filter((permission) =>
                (group.modules as readonly string[]).includes(
                  permission.module,
                ),
              );

              if (!rows.length) return null;

              return (
                <div key={group.key}>
                  <Text strong className="text-xs tracking-wide">
                    {group.label}
                  </Text>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {rows.map((permission) => {
                      const locked =
                        holdsAdmin &&
                        FORBIDDEN_WITH_ADMIN.includes(permission.code);

                      return (
                        <Tooltip
                          key={permission.code}
                          title={
                            locked ? messages.roleAdmin.adminLockedHint : null
                          }
                        >
                          <label
                            className={`flex items-start gap-2 rounded border border-black/5 p-2 ${
                              locked ? "opacity-50" : ""
                            }`}
                          >
                            <Checkbox
                              checked={checked.includes(permission.code)}
                              disabled={locked}
                              onChange={(event) =>
                                toggle(permission.code, event.target.checked)
                              }
                            />
                            <span className="min-w-0">
                              <code className="block truncate text-xs">
                                {permission.code}
                              </code>
                              <Text type="secondary" className="text-xs">
                                {thaiFor(permission.code)}
                              </Text>
                            </span>
                          </label>
                        </Tooltip>
                      );
                    })}
                  </div>

                  {group.key === "adminAudit" && holdsAdmin && (
                    <Paragraph type="secondary" className="mt-2! mb-0! text-xs">
                      {messages.roleAdmin.adminLocked}
                    </Paragraph>
                  )}
                </div>
              );
            })}
          </Space>
        )}
      </Card>

      <div className="space-y-4">
        <Card
          title={messages.roleAdmin.holdersTitle(holders.length)}
          extra={
            selected && (
              <Button size="small" onClick={() => setBinding(true)}>
                {messages.roleAdmin.bindManually}
              </Button>
            )
          }
        >
          {panelError && (
            <Alert
              type="error"
              showIcon
              className="mb-3!"
              title={messages.common.loadError}
              description={panelError}
            />
          )}

          {panelsLoading ? (
            <Spin />
          ) : holders.length ? (
            <ul className="divide-y divide-black/5">
              {holders.map((holder) => (
                <li
                  key={holder.userId}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{holder.displayName}</span>

                  <span className="flex shrink-0 items-center gap-2">
                    <Tag color={holder.source === "MANUAL" ? "orange" : "blue"}>
                      {holder.source === "MANUAL"
                        ? messages.roleAdmin.manual
                        : messages.roleAdmin.fromKeycloak}
                    </Tag>

                    {holder.source === "MANUAL" ? (
                      <Button
                        size="small"
                        type="link"
                        danger
                        disabled={busy}
                        onClick={() => void revoke(holder)}
                      >
                        {messages.roleAdmin.revoke}
                      </Button>
                    ) : (
                      <Tooltip
                        title={messages.roleAdmin.keycloakNotRevocable}
                      >
                        <Text type="secondary" className="text-xs">
                          —
                        </Text>
                      </Tooltip>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty description={messages.roleAdmin.noHolders} />
          )}
        </Card>

        <Card title={messages.roleAdmin.recentTitle} size="small">
          {audit.length ? (
            <ul className="space-y-2">
              {audit.map((entry) => (
                <li key={entry.id} className="text-xs">
                  <Text>{entry.eventType}</Text>{" "}
                  <Text type="secondary">
                    — {entry.actorUsername ?? "system"} ·{" "}
                    {shortDate(entry.createdAt)}
                  </Text>
                </li>
              ))}
            </ul>
          ) : (
            <Text type="secondary" className="text-xs">
              {messages.roleAdmin.recentEmpty}
            </Text>
          )}

          <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
            {messages.roleAdmin.auditNote}
          </Paragraph>
        </Card>
      </div>

      {selected && (
        <BindUserDialog
          open={binding}
          roleId={selected.id}
          companyId={companyId}
          boundUserIds={holders.map((holder) => holder.userId)}
          onClose={() => setBinding(false)}
          onBound={() => {
            setBinding(false);
            setRoles((current) =>
              current.map((role) =>
                role.id === selected.id
                  ? { ...role, _count: { users: role._count.users + 1 } }
                  : role,
              ),
            );
            void refreshPanels(selected.id);
          }}
        />
      )}

      <NewRoleDialog
        open={creating}
        companyId={companyId}
        onClose={() => setCreating(false)}
        onCreated={(role) => {
          setRoles((current) => [...current, role]);
          setCreating(false);
          void select(role);
        }}
      />
    </div>
  );
}

/**
 * A new role starts with no permissions at all.
 *
 * The alternative — copying a sensible default — is how a role quietly ends up
 * granting more than whoever created it intended. An empty role can do nothing
 * until someone ticks a box and can explain why.
 */
function NewRoleDialog({
  open,
  companyId,
  onClose,
  onCreated,
}: {
  open: boolean;
  companyId: string;
  onClose: () => void;
  onCreated: (role: RoleRow) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await createRole({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      permissions: [],
      company_id: companyId,
    });

    setBusy(false);

    if (result.ok) {
      setCode("");
      setName("");
      onCreated({ ...result.data, _count: { users: 0 } });
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.roleAdmin.newRoleTitle}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={busy}
      okButtonProps={{ disabled: !code.trim() || !name.trim() }}
    >
      {error && (
        <Alert type="error" showIcon title={error} className="mb-3!" />
      )}

      <Space orientation="vertical" className="flex">
        <label className="block">
          <Text strong>{messages.roleAdmin.code}</Text>
          <Input
            className="mt-1"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="sales_support"
          />
          <Text type="secondary" className="text-xs">
            {messages.roleAdmin.codeHint}
          </Text>
        </label>

        <label className="block">
          <Text strong>{messages.roleAdmin.name}</Text>
          <Input
            className="mt-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ทีมสนับสนุนการขาย"
          />
        </label>
      </Space>
    </Modal>
  );
}

/**
 * The emergency hand-binding §5.4 allows when waiting for Keycloak is not an
 * option ("กรณีเร่งด่วน").
 *
 * The list comes from `GET /users`, which is scope-filtered, so an admin can
 * only bind someone already inside their own reach. People who already hold
 * the role are filtered out rather than shown greyed: re-binding is a no-op
 * the API would reject, and offering it invites the question of what happened.
 */
function BindUserDialog({
  open,
  roleId,
  companyId,
  boundUserIds,
  onClose,
  onBound,
}: {
  open: boolean;
  roleId: string;
  companyId: string;
  boundUserIds: string[];
  onClose: () => void;
  onBound: () => void;
}) {
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<
    { id: string; username: string; displayName: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function look() {
    setBusy(true);
    setError(null);

    const result = await searchUsers(term);

    if (result.ok) {
      setFound(
        result.data.data.filter((user) => !boundUserIds.includes(user.id)),
      );
    } else setError(result.message);

    setBusy(false);
  }

  async function bind(userId: string) {
    setBusy(true);
    setError(null);

    const result = await grantRole(userId, {
      role_id: roleId,
      company_id: companyId,
    });

    setBusy(false);

    if (result.ok) {
      setTerm("");
      setFound([]);
      onBound();
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.roleAdmin.bindManually}
      onCancel={onClose}
      footer={null}
    >
      {error && (
        <Alert type="error" showIcon title={error} className="mb-3!" />
      )}

      <Space orientation="vertical" className="flex">
        <Input.Search
          value={term}
          placeholder={messages.users.searchPlaceholder}
          loading={busy}
          onChange={(event) => setTerm(event.target.value)}
          onSearch={() => void look()}
        />

        {found.length ? (
          <ul className="divide-y divide-black/5">
            {found.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {user.displayName}{" "}
                  <Text type="secondary" className="text-xs">
                    {user.username}
                  </Text>
                </span>
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => void bind(user.id)}
                >
                  {messages.org.addRole}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Space>
    </Modal>
  );
}
