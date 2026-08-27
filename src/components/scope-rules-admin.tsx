"use client";

import { useState } from "react";
import { Alert, Button, Card, Empty, Select, Space, message } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { replaceScopeRules } from "@/lib/api/client-roles";
import type { RoleRow, ScopeRuleRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const SCOPES = ["own", "team", "department", "company", "all"] as const;
const RESOURCES = ["request", "approval_case", "user"] as const;

interface Draft {
  roleId: string;
  resource: string;
  scope: string;
}

/**
 * SCOPE-01 — the (role, resource) → scope table.
 *
 * No mockup exists for this tab, so it borrows A4's shape: one table, one save
 * that replaces the whole set, and a line saying what that means. Replacing
 * wholesale matches the API (`PUT /admin/scope-rules`) and the SLA screen
 * before it — a diff would be easier to get subtly wrong than to explain.
 *
 * A role with no row here sees only its own records. That is the safe default
 * and worth stating on screen, because an empty table looks like a broken
 * screen rather than a deliberate floor.
 */
export function ScopeRulesAdmin({
  rules: initial,
  roles,
}: {
  readonly rules: ScopeRuleRow[];
  readonly roles: RoleRow[];
}) {
  const [rows, setRows] = useState<Draft[]>(
    initial.map((rule) => ({
      roleId: rule.roleId,
      resource: rule.resource,
      scope: rule.scope,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function roleName(roleId: string): string {
    return roles.find((role) => role.id === roleId)?.name ?? roleId;
  }

  function update(index: number, patch: Partial<Draft>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);

    const result = await replaceScopeRules({
      rules: rows.map((row) => ({
        role_id: row.roleId,
        resource: row.resource,
        scope: row.scope,
      })),
    });

    if (result.ok) void message.success(messages.scopeRules.saved);
    else setError(result.message);

    setBusy(false);
  }

  return (
    <Card
      title={messages.scopeRules.title}
      extra={
        <Space size="small">
          <Button
            size="small"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  roleId: roles[0]?.id ?? "",
                  resource: "request",
                  scope: "own",
                },
              ])
            }
          >
            {messages.scopeRules.addRule}
          </Button>
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() => void save()}
          >
            {messages.scopeRules.save}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" className="flex">
        <Paragraph type="secondary" className="mb-0! text-xs">
          {messages.scopeRules.subtitle}
        </Paragraph>

        {error && <Alert type="error" showIcon message={error} />}

        {rows.length ? (
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <li
                key={`${row.roleId}-${row.resource}-${index}`}
                className="flex flex-wrap items-center gap-2 rounded border border-black/5 p-2"
              >
                <Select
                  size="small"
                  style={{ width: 200 }}
                  value={row.roleId || undefined}
                  placeholder={messages.scopeRules.columns.role}
                  onChange={(next) => update(index, { roleId: next })}
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                />

                <Select
                  size="small"
                  style={{ width: 160 }}
                  value={row.resource}
                  onChange={(next) => update(index, { resource: next })}
                  options={RESOURCES.map((resource) => ({
                    value: resource,
                    label:
                      messages.scopeRules.resourceLabel[resource] ?? resource,
                  }))}
                />

                <Select
                  size="small"
                  style={{ width: 220 }}
                  value={row.scope}
                  onChange={(next) => update(index, { scope: next })}
                  options={SCOPES.map((scope) => ({
                    value: scope,
                    label: messages.scopeRules.scopeLabel[scope] ?? scope,
                  }))}
                />

                <Text type="secondary" className="text-xs">
                  {roleName(row.roleId)}
                </Text>

                <Button
                  size="small"
                  type="link"
                  danger
                  onClick={() =>
                    setRows((current) => current.filter((_, i) => i !== index))
                  }
                >
                  {messages.keycloakMapping.remove}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty description={messages.scopeRules.empty} />
        )}

        <Alert
          type="warning"
          showIcon
          message={messages.scopeRules.replaceNote}
        />
      </Space>
    </Card>
  );
}
