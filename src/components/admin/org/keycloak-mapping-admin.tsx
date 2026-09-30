"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Empty, Input, Space } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import {
  replaceKeycloakMappings,
  syncKeycloakMappingNames,
  type KeycloakNameSyncReport,
} from "@/lib/api/client-roles";
import type { KeycloakRoleMappingRow, RoleRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";

interface Draft {
  keycloakRole: string;
  roleId: string;
}

/**
 * ROLE-03 — Keycloak role → system role table, kept for reference only.
 * Keycloak is login only: the backend never applies these mappings.
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
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [rows, setRows] = useState<Draft[]>(
    initial.map((mapping) => ({
      keycloakRole: mapping.keycloakRole,
      roleId: mapping.roleId,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<KeycloakNameSyncReport | null>(
    null,
  );

  /**
   * Pulls the realm's current role names back over this table.
   *
   * One way, by design: this never writes to Keycloak. It exists because a
   * rename there used to be invisible here — the mapping kept the old name,
   * nothing matched the new one, and every holder of that role lost it at their
   * next sign-in with nothing on screen to explain it.
   */
  async function syncNames() {
    setSyncing(true);
    setError(null);

    const result = await syncKeycloakMappingNames(companyId);

    setSyncing(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSyncReport(result.data);
    setRows((current) =>
      current.map((row) => {
        const renamed = result.data.renamed.find(
          (entry) => entry.from === row.keycloakRole,
        );
        return renamed ? { ...row, keycloakRole: renamed.to } : row;
      }),
    );
    void message.success(messages.keycloakMapping.syncDone);
  }

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
          <Button size="small" loading={syncing} onClick={() => void syncNames()}>
            {messages.keycloakMapping.syncNames}
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
        <Alert
          type="warning"
          showIcon
          title={messages.keycloakMapping.disabledNote}
        />

        <Paragraph type="secondary" className="mb-0! text-xs">
          {messages.keycloakMapping.subtitle}
        </Paragraph>

        {error && <Alert type="error" showIcon title={error} />}

        {/*
          What the sync did, in the words an admin needs: which names moved, and
          which mappings now point at a realm role that is gone. `missing` is a
          warning rather than an error — the row was kept on purpose, so that a
          half-configured realm cannot strip everyone's permissions in one pass.
        */}
        {syncReport && (
          <Alert
            type={syncReport.missing.length ? "warning" : "success"}
            showIcon
            title={messages.keycloakMapping.syncSummary(
              syncReport.renamed.length,
              syncReport.linked.length,
              syncReport.checked,
            )}
            description={
              <>
                {syncReport.renamed.map((entry) => (
                  <div key={entry.from}>
                    {entry.from} → {entry.to}
                  </div>
                ))}
                {syncReport.missing.length > 0 && (
                  <div>
                    {messages.keycloakMapping.syncMissing(
                      syncReport.missing.join(", "),
                    )}
                  </div>
                )}
              </>
            }
          />
        )}

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
