"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Space, Switch, Table, Typography } from "antd";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.costCenters;

interface CostCenterRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly active: boolean;
}

/** Add, rename, (de)activate — never delete: old disbursements still name the code. */
export function CostCentersAdmin() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<CostCenterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<CostCenterRow[]>("cost-centers?include_inactive=true").then((result) => {
      if (!live) return;
      if (result.ok) setRows(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [reload]);

  async function send(path: string, method: "POST" | "PATCH", body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const result = await appApi<CostCenterRow>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(messages.disbursement.saved);
    setReload((n) => n + 1);
    return true;
  }

  async function add() {
    if (await send("cost-centers", "POST", { code: code.trim(), name: name.trim() })) {
      setCode("");
      setName("");
    }
  }

  return (
    <Card title={m.title}>
      <Typography.Paragraph type="secondary">{m.hint}</Typography.Paragraph>
      <Space wrap className="mb-4">
        <Input
          placeholder={m.code}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ width: 160 }}
          title={m.codeHint}
        />
        <Input
          placeholder={m.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 260 }}
        />
        <Button
          type="primary"
          loading={busy}
          disabled={!code.trim() || !name.trim()}
          onClick={() => void add()}
        >
          {m.add}
        </Button>
      </Space>
      {error && <Alert type="error" showIcon className="mb-3" title={error} />}
      <Table<CostCenterRow>
        rowKey="id"
        size="small"
        loading={rows === null}
        dataSource={rows ?? []}
        locale={{ emptyText: m.empty }}
        pagination={false}
        scroll={{ x: 640 }}
        columns={[
          { title: m.code, dataIndex: "code", width: 140 },
          {
            title: m.name,
            dataIndex: "name",
            render: (value: string, row) => (
              <Space.Compact className="w-full">
                <Input
                  value={names[row.id] ?? value}
                  onChange={(e) => setNames({ ...names, [row.id]: e.target.value })}
                />
                <Button
                  disabled={!names[row.id]?.trim() || names[row.id] === value}
                  loading={busy}
                  onClick={() => void send(`cost-centers/${row.id}`, "PATCH", { name: names[row.id].trim() })}
                >
                  {m.save}
                </Button>
              </Space.Compact>
            ),
          },
          {
            title: m.active,
            dataIndex: "active",
            width: 120,
            render: (value: boolean, row) => (
              <Switch
                checked={value}
                checkedChildren={m.active}
                unCheckedChildren={m.inactive}
                loading={busy}
                onChange={(next) => void send(`cost-centers/${row.id}`, "PATCH", { active: next })}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
