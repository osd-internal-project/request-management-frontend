"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Space, Switch, Table, Tooltip } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { SystemCompany } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.system.companies;

/** P5 — create a company, rename it, switch it off; never delete (its rows stay). */
export function SystemCompaniesAdmin() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<SystemCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ code: "", name: "", doc_prefix: "" });
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<SystemCompany[]>("system/companies").then((answer) => {
      if (!live) return;
      if (answer.ok) setRows(answer.data);
      else setError(answer.message);
    });
    return () => {
      live = false;
    };
  }, [reload]);

  async function send(path: string, method: "POST" | "PATCH", body: unknown, done: string) {
    setBusy(true);
    setError(null);
    const answer = await appApi<SystemCompany>(path, { method, body: JSON.stringify(body) });
    setBusy(false);
    if (!answer.ok) {
      setError(answer.message);
      return false;
    }
    message.success(done);
    setReload((n) => n + 1);
    return true;
  }

  async function create() {
    const ok = await send(
      "system/companies",
      "POST",
      {
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        doc_prefix: draft.doc_prefix.trim().toUpperCase(),
      },
      m.created,
    );
    if (ok) setDraft({ code: "", name: "", doc_prefix: "" });
  }

  const ready = draft.code.trim() && draft.name.trim() && draft.doc_prefix.trim();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>

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
          columns={[
            { title: m.code, dataIndex: "code", width: 140 },
            {
              title: m.name,
              render: (_, row) => (
                <Input
                  value={names[row.id] ?? row.name}
                  aria-label={`${m.name} ${row.code}`}
                  onChange={(event) => setNames((n) => ({ ...n, [row.id]: event.target.value }))}
                  onBlur={() => {
                    const next = names[row.id]?.trim();
                    if (next && next !== row.name) {
                      void send(`system/companies/${row.id}`, "PATCH", { name: next }, m.saved);
                    }
                  }}
                />
              ),
            },
            { title: m.docPrefix, dataIndex: "docPrefix", width: 160 },
            { title: m.members, render: (_, row) => row._count.users, width: 100 },
            {
              title: m.active,
              width: 100,
              render: (_, row) => (
                <Switch
                  checked={row.active}
                  disabled={busy}
                  aria-label={`${m.active} ${row.code}`}
                  onChange={(active) =>
                    void send(`system/companies/${row.id}`, "PATCH", { active }, m.saved)
                  }
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
