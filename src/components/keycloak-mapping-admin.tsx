"use client";

import { useState } from "react";
import { Alert, Button, Card, Empty, Input, Space, message } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import { replaceKeycloakMappings } from "@/lib/api/client-roles";
import type { KeycloakRoleMappingRow, RoleRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/search-select";

interface Draft {
  keycloakRole: string;
  roleId: string;
}

/**
 * ROLE-03 — Keycloak realm role → system role, for one company.
 *
 * No mockup exists for this tab. What it has to communicate above all is the
 * delay: nothing here changes the rights of anyone already signed in. Mapped
 * grants are rewritten wholesale at the next login (which is also what makes
 * revoking in Keycloak work), so an admin who edits this table and watches a
 * colleague's screen will see nothing happen, and would reasonably conclude
 * the save failed.
 */
export function KeycloakMappingAdmin({
  mappings: initial,
  roles,
  companyId,
}: {
  readonly mappings: KeycloakRoleMappingRow[];
  readonly roles: RoleRow[];
  readonly companyId: string;
}) {
  const [rows, setRows] = useState<Draft[]>(
    initial.map((mapping) => ({
      keycloakRole: mapping.keycloakRole,
      roleId: mapping.roleId,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<Draft>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);

    const result = await replaceKeycloakMappings({
      company_id: companyId,
      mappings: rows
        // A half-typed row would delete a live mapping on save, so incomplete
        // rows are dropped rather than sent as blanks.
        .filter((row) => row.keycloakRole.trim() && row.roleId)
        .map((row) => ({
          keycloak_role: row.keycloakRole.trim(),
          role_id: row.roleId,
        })),
    });

    if (result.ok) void message.success(messages.keycloakMapping.saved);
    else setError(result.message);

    setBusy(false);
  }

  return (
    <Card
      title={messages.keycloakMapping.title}
      extra={
        <Space size="small">
          <Button
            size="small"
            onClick={() =>
              setRows((current) => [
                ...current,
                { keycloakRole: "", roleId: roles[0]?.id ?? "" },
              ])
            }
          >
            {messages.keycloakMapping.addMapping}
          </Button>
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() => void save()}
          >
            {messages.keycloakMapping.save}
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size="middle" className="flex">
        <Paragraph type="secondary" className="mb-0! text-xs">
          {messages.keycloakMapping.subtitle}
        </Paragraph>

        {error && <Alert type="error" showIcon title={error} />}

        <Alert
          type="info"
          showIcon
          title={messages.keycloakMapping.effectNote}
        />

        {rows.length ? (
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center gap-2 rounded border border-black/5 p-2"
              >
                <Input
                  size="small"
                  style={{ width: 220 }}
                  value={row.keycloakRole}
                  placeholder={messages.keycloakMapping.keycloakRolePlaceholder}
                  onChange={(event) =>
                    update(index, { keycloakRole: event.target.value })
                  }
                />

                <span aria-hidden>→</span>

                <SearchSelect
                  size="small"
                  style={{ width: 220 }}
                  value={row.roleId || undefined}
                  placeholder={messages.keycloakMapping.columns.systemRole}
                  onChange={(next) => update(index, { roleId: next })}
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                />

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
          <Empty description={messages.keycloakMapping.empty} />
        )}

        <Alert
          type="warning"
          showIcon
          title={messages.keycloakMapping.replaceNote}
        />
      </Space>
    </Card>
  );
}
