"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  Paginated,
  SharedRole,
  SystemCompany,
  SystemUser,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.system.users;
const PAGE_SIZE = 25;

interface Filter {
  q: string;
  companyId?: string;
  status?: SystemUser["status"];
  page: number;
}

function query(filter: Filter): string {
  const params = new URLSearchParams({
    page: String(filter.page),
    page_size: String(PAGE_SIZE),
  });
  if (filter.q.trim()) params.set("q", filter.q.trim());
  if (filter.companyId) params.set("company_id", filter.companyId);
  if (filter.status) params.set("status", filter.status);
  return params.toString();
}

/** P5 — everyone in every company; suspend, reactivate, move between companies. */
export function SystemUsersAdmin({
  canManageRoles,
}: {
  /** `system.role.manage` — without it the modal never asks for `/system/roles`. */
  readonly canManageRoles: boolean;
}) {
  const [filter, setFilter] = useState<Filter>({ q: "", page: 1 });
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<Paginated<SystemUser> | null>(null);
  const [companies, setCompanies] = useState<SystemCompany[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<SystemCompany[]>("system/companies").then((answer) => {
      if (live && answer.ok) setCompanies(answer.data);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void appApi<Paginated<SystemUser>>(`system/users?${query(filter)}`).then(
      (answer) => {
        if (!live) return;
        if (answer.ok) {
          setResult(answer.data);
          setError(null);
        } else setError(answer.message);
      },
    );
    return () => {
      live = false;
    };
  }, [filter, reload]);

  function changed(user: SystemUser) {
    setEditing(user);
    setReload((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>

      <Card>
        <Space wrap className="mb-4">
          <Input.Search
            allowClear
            value={search}
            placeholder={m.searchPlaceholder}
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) =>
              setFilter((f) => ({ ...f, q: value, page: 1 }))
            }
            className="w-72"
          />
          <Select
            allowClear
            placeholder={m.allCompanies}
            className="w-48"
            value={filter.companyId}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(companyId?: string) =>
              setFilter((f) => ({ ...f, companyId, page: 1 }))
            }
          />
          <Select
            allowClear
            placeholder={m.allStatuses}
            className="w-36"
            value={filter.status}
            options={[
              { value: "ACTIVE", label: m.active },
              { value: "SUSPENDED", label: m.suspended },
            ]}
            onChange={(status?: SystemUser["status"]) =>
              setFilter((f) => ({ ...f, status, page: 1 }))
            }
          />
        </Space>

        {error && (
          <Alert type="error" showIcon title={error} className="mb-4" />
        )}

        <Table<SystemUser>
          rowKey="id"
          loading={!result && !error}
          dataSource={result?.data ?? []}
          pagination={{
            current: filter.page,
            pageSize: PAGE_SIZE,
            total: result?.total ?? 0,
            showSizeChanger: false,
            onChange: (page) => setFilter((f) => ({ ...f, page })),
          }}
          columns={[
            {
              title: m.columns.name,
              render: (_, user) => (
                <div>
                  <div>{user.displayName}</div>
                  <Text type="secondary" className="text-xs">
                    {user.username}
                    {user.email ? ` (${user.email})` : ""}
                  </Text>
                </div>
              ),
            },
            {
              title: m.columns.companies,
              render: (_, user) =>
                user.companies.length ? (
                  <Space size={4} wrap>
                    {user.companies.map(({ company, isPrimary }) => (
                      <Tag
                        key={company.id}
                        color={isPrimary ? "blue" : undefined}
                        title={isPrimary ? m.primary : undefined}
                      >
                        {isPrimary ? "★ " : ""}
                        {company.code}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">{m.noCompany}</Text>
                ),
            },
            {
              title: m.columns.status,
              render: (_, user) =>
                user.status === "ACTIVE" ? (
                  <Tag color="green">{m.active}</Tag>
                ) : (
                  <Tag color="red" title={user.suspendReason ?? undefined}>
                    {m.suspended}
                  </Tag>
                ),
            },
            {
              title: m.columns.systemRoles,
              render: (_, user) =>
                user.systemRoles.map(({ role }) => (
                  <Tag key={role.id}>{role.name}</Tag>
                )),
            },
            {
              key: "actions",
              align: "right",
              render: (_, user) => (
                <Button onClick={() => setEditing(user)}>{m.manage}</Button>
              ),
            },
          ]}
        />
      </Card>

      {editing && (
        <ManageUserModal
          user={editing}
          companies={companies}
          canManageRoles={canManageRoles}
          onChanged={changed}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ManageUserModal({
  user,
  companies,
  canManageRoles,
  onChanged,
  onClose,
}: {
  readonly user: SystemUser;
  readonly companies: readonly SystemCompany[];
  readonly canManageRoles: boolean;
  readonly onChanged: (user: SystemUser) => void;
  readonly onClose: () => void;
}) {
  const { message } = App.useApp();
  const [memberOf, setMemberOf] = useState<string[]>(
    user.companies.map((row) => row.company.id),
  );
  const [primary, setPrimary] = useState<string | undefined>(
    user.primaryCompanyId ?? undefined,
  );
  const [reason, setReason] = useState("");
  const [roles, setRoles] = useState<SharedRole[]>([]);
  const [roleToAdd, setRoleToAdd] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageRoles) return;
    let live = true;
    void appApi<SharedRole[]>("system/roles").then((answer) => {
      if (live && answer.ok) {
        setRoles(
          answer.data.filter((role) => role.level === "SYSTEM" && role.active),
        );
      }
    });
    return () => {
      live = false;
    };
  }, [canManageRoles]);

  async function run(
    path: string,
    method: "POST" | "PUT" | "DELETE",
    body: unknown,
    done: string,
  ) {
    setBusy(true);
    setError(null);
    const answer = await appApi<unknown>(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!answer.ok) {
      setBusy(false);
      setError(answer.message);
      return;
    }
    // Re-read the row rather than trusting each route's own response shape.
    const fresh = await appApi<Paginated<SystemUser>>(
      `system/users?q=${encodeURIComponent(user.username)}&page_size=${PAGE_SIZE}`,
    );
    setBusy(false);
    message.success(done);
    const row = fresh.ok
      ? fresh.data.data.find((u) => u.id === user.id)
      : undefined;
    if (row) onChanged(row);
  }

  const held = new Set(user.systemRoles.map(({ role }) => role.id));
  const primaryValid =
    primary && memberOf.includes(primary) ? primary : memberOf[0];

  return (
    <Modal
      open
      title={`${m.modalTitle}: ${user.displayName}`}
      footer={null}
      onCancel={onClose}
      width={640}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}

      <Title level={5}>{m.companiesSection}</Title>
      <Text type="secondary" className="block text-xs">
        {m.companiesHint}
      </Text>
      <Radio.Group
        value={primaryValid}
        onChange={(event) => setPrimary(event.target.value as string)}
        className="mt-2 w-full"
      >
        <div className="flex flex-col gap-1">
          {companies.map((company) => {
            const on = memberOf.includes(company.id);
            return (
              <div
                key={company.id}
                className="flex items-center justify-between"
              >
                <Checkbox
                  checked={on}
                  onChange={(event) =>
                    setMemberOf((ids) =>
                      event.target.checked
                        ? [...ids, company.id]
                        : ids.filter((id) => id !== company.id),
                    )
                  }
                >
                  {company.name} <Text type="secondary">({company.code})</Text>
                </Checkbox>
                <Radio value={company.id} disabled={!on}>
                  {m.setPrimary}
                </Radio>
              </div>
            );
          })}
        </div>
      </Radio.Group>
      <Button
        className="mt-3"
        type="primary"
        loading={busy}
        onClick={() =>
          run(
            `system/users/${user.id}/companies`,
            "PUT",
            { company_ids: memberOf, primary_company_id: primaryValid },
            m.companiesSaved,
          )
        }
      >
        {m.saveCompanies}
      </Button>

      {canManageRoles && (
        <>
          <Divider />
          <Title level={5}>{m.systemRolesSection}</Title>
          <Space wrap>
            {user.systemRoles.map(({ role }) => (
              <Tag
                key={role.id}
                closable
                closeIcon={<span aria-label={m.removeSystemRole}>×</span>}
                onClose={(event) => {
                  event.preventDefault();
                  void run(
                    `system/users/${user.id}/system-roles/${role.id}`,
                    "DELETE",
                    undefined,
                    m.systemRoleRevoked,
                  );
                }}
              >
                {role.name}
              </Tag>
            ))}
          </Space>
          {roles.some((role) => !held.has(role.id)) && (
            <Space.Compact className="mt-2">
              <Select
                className="w-60"
                value={roleToAdd}
                onChange={setRoleToAdd}
                options={roles
                  .filter((role) => !held.has(role.id))
                  .map((role) => ({ value: role.id, label: role.name }))}
              />
              <Button
                disabled={!roleToAdd}
                loading={busy}
                onClick={() =>
                  run(
                    `system/users/${user.id}/system-roles`,
                    "POST",
                    { role_id: roleToAdd },
                    m.systemRoleGranted,
                  )
                }
              >
                {m.addSystemRole}
              </Button>
            </Space.Compact>
          )}
        </>
      )}

      <Divider />
      <Title level={5}>{m.suspendSection}</Title>
      {user.status === "SUSPENDED" ? (
        <div className="flex flex-col gap-2 items-start">
          <Text>
            {m.suspendedBecause}: {user.suspendReason ?? "—"}
          </Text>
          <div>
            <Button
              loading={busy}
              onClick={() =>
                run(
                  `system/users/${user.id}/reactivate`,
                  "POST",
                  undefined,
                  m.reactivated,
                )
              }
            >
              {m.reactivate}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 items-start">
          <Text type="secondary" className="block text-xs">
            {m.suspendHint}
          </Text>
          <Input.TextArea
            value={reason}
            maxLength={500}
            placeholder={m.suspendReason}
            aria-label={m.suspendReason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button
            danger
            disabled={!reason.trim()}
            loading={busy}
            onClick={() =>
              run(
                `system/users/${user.id}/suspend`,
                "POST",
                { reason: reason.trim() },
                m.suspended_ok,
              )
            }
          >
            {m.suspend}
          </Button>
        </div>
      )}
    </Modal>
  );
}
