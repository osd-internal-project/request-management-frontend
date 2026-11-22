"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Input, Select, Space, Table, Tag, Tooltip } from "antd";
import { appApi } from "@/lib/api/client";
import type { IntegrationRow } from "@/lib/api/integrations";
import type { Paginated, SystemCompany, SystemUser } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { PageHeader } from "@/components/admin/page-header";

const m = messages.system.companies;

interface IntegrationTally {
  integrations: number;
  keys: number;
}

/** ระบบภายนอกและกุญแจต่อบริษัท — นับจาก hub ไม่ใช่ endpoint แยก */
function tallyByCompany(rows: IntegrationRow[]): Map<string, IntegrationTally> {
  const tally = new Map<string, IntegrationTally>();
  for (const row of rows) {
    if (!row.company_id) continue;
    const current = tally.get(row.company_id) ?? { integrations: 0, keys: 0 };
    tally.set(row.company_id, {
      integrations: current.integrations + 1,
      keys: current.keys + row.api_key_count,
    });
  }
  return tally;
}

/**
 * ภาพรวมทุกบริษัท (ระดับองค์กรเท่านั้น) + สร้างบริษัทพร้อมตั้งต้น — แก้รายบริษัทที่หน้ารายบริษัท.
 * `canIntegrations` = `system.integration.manage`; `canPickAdmin` = `system.user.read`.
 */
export function SystemCompaniesAdmin({
  canIntegrations,
  canPickAdmin,
}: {
  readonly canIntegrations: boolean;
  readonly canPickAdmin: boolean;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<SystemCompany[] | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ code: "", name: "", doc_prefix: "" });
  const [adminId, setAdminId] = useState<string | undefined>();
  const [people, setPeople] = useState<SystemUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<SystemCompany[]>("system/companies").then((answer) => {
      if (!live) return;
      if (answer.ok) setRows(answer.data);
      else setError(answer.message);
    });
    if (canIntegrations) {
      void appApi<IntegrationRow[]>("system/integrations").then((answer) => {
        if (live && answer.ok) setIntegrations(answer.data);
      });
    }
    return () => {
      live = false;
    };
  }, [reload, canIntegrations]);

  const tally = useMemo(() => tallyByCompany(integrations), [integrations]);

  function searchPeople(q: string) {
    if (!q.trim()) return;
    void appApi<Paginated<SystemUser>>(
      `system/users?q=${encodeURIComponent(q.trim())}&status=ACTIVE&page=1&page_size=20`,
    ).then((answer) => {
      if (answer.ok) setPeople(answer.data.data);
    });
  }

  async function create() {
    setBusy(true);
    setError(null);
    const answer = await appApi<SystemCompany>("system/companies", {
      method: "POST",
      body: JSON.stringify({
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        doc_prefix: draft.doc_prefix.trim().toUpperCase(),
        ...(adminId ? { admin_user_id: adminId } : {}),
      }),
    });
    setBusy(false);
    if (!answer.ok) return setError(answer.message);
    message.success(m.createdWithSetup);
    setDraft({ code: "", name: "", doc_prefix: "" });
    setAdminId(undefined);
    setReload((n) => n + 1);
  }

  const ready = draft.code.trim() && draft.name.trim() && draft.doc_prefix.trim();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitleOverview} />

      {error && <Alert type="error" showIcon title={error} />}

      <Card>
        <Space wrap align="start">
          <Tooltip title={m.codeHint}>
            <Input
              value={draft.code}
              placeholder={m.code}
              aria-label={m.code}
              className="w-40"
              onChange={(event) => setDraft((d) => ({ ...d, code: event.target.value }))}
            />
          </Tooltip>
          <Input
            value={draft.name}
            placeholder={m.name}
            aria-label={m.name}
            className="w-64"
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
          />
          <Input
            value={draft.doc_prefix}
            placeholder={m.docPrefix}
            aria-label={m.docPrefix}
            className="w-48"
            onChange={(event) => setDraft((d) => ({ ...d, doc_prefix: event.target.value }))}
          />
          {canPickAdmin && (
            <Tooltip title={m.firstAdminHint}>
              <Select<string>
                showSearch
                allowClear
                filterOption={false}
                className="w-64"
                placeholder={m.firstAdmin}
                aria-label={m.firstAdmin}
                value={adminId}
                onSearch={searchPeople}
                onChange={setAdminId}
                options={people.map((person) => ({
                  value: person.id,
                  label: person.email
                    ? `${person.displayName} (${person.email})`
                    : person.displayName,
                }))}
              />
            </Tooltip>
          )}
          <Button type="primary" disabled={!ready} loading={busy} onClick={create}>
            {m.create}
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<SystemCompany>
          rowKey="id"
          loading={!rows && !error}
          dataSource={rows ?? []}
          pagination={false}
          className="tabular-nums"
          columns={[
            {
              title: m.code,
              dataIndex: "code",
              width: 140,
              render: (code: string, row) => (
                <Link href={ROUTES.systemCompanyDetail(row.id)}>{code}</Link>
              ),
            },
            { title: m.name, dataIndex: "name" },
            {
              title: m.members,
              width: 150,
              render: (_, row) =>
                m.membersActive(row._count.users - row.suspendedMembers, row.suspendedMembers),
            },
            {
              title: m.admins,
              width: 110,
              render: (_, row) =>
                row.adminCount ? row.adminCount : <Tag color="warning">{m.noAdmin}</Tag>,
            },
            { title: m.orgUnits, width: 100, render: (_, row) => row._count.orgUnits },
            ...(canIntegrations
              ? [
                  {
                    title: m.integrations,
                    key: "integrations",
                    width: 110,
                    render: (_: unknown, row: SystemCompany) =>
                      tally.get(row.id)?.integrations ?? 0,
                  },
                  {
                    title: m.keys,
                    key: "keys",
                    width: 90,
                    render: (_: unknown, row: SystemCompany) => tally.get(row.id)?.keys ?? 0,
                  },
                ]
              : []),
            {
              title: m.active,
              width: 100,
              render: (_, row) => (
                <Tag color={row.active ? "success" : "default"}>
                  {row.active ? m.statusActive : m.statusClosed}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
