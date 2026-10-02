"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Card, Input, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { ConfigSearchRow } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.configs;

/** CD-217 — configuration values across every project one may see. */
export function ConfigSearch() {
  const [rows, setRows] = useState<ConfigSearchRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    const response = await appApi<ConfigSearchRow[]>(
      `project-configs?q=${encodeURIComponent(q.trim())}`,
    );
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setRows(response.data);
  }

  return (
    <Card title={m.searchPage.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.searchPage.hint}
      </Text>
      <Input.Search
        className="mb-3 max-w-xl"
        allowClear
        enterButton
        loading={busy}
        placeholder={m.searchPage.placeholder}
        onSearch={(value) => void search(value)}
      />
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {rows && (
        <Table<ConfigSearchRow>
          rowKey={(row) => `${row.projectId}-${row.label}`}
          size="small"
          dataSource={rows}
          pagination={rows.length > 20 ? { pageSize: 20 } : false}
          locale={{ emptyText: m.searchPage.none }}
          scroll={{ x: 800 }}
          columns={[
            {
              title: m.columns.project,
              width: 220,
              render: (_: unknown, row) => (
                <Link href={ROUTES.projectDetail(row.projectId)}>
                  {row.projectNo} · {row.projectName}
                </Link>
              ),
            },
            { title: m.columns.label, dataIndex: "label", width: 70 },
            { title: m.columns.system, dataIndex: "system", width: 180 },
            { title: m.columns.key, dataIndex: "key", width: 160 },
            {
              title: m.columns.value,
              render: (_: unknown, row) => (
                <span className="font-mono text-xs break-all">
                  {row.isSecret && <Tag color="purple">{m.secret}</Tag>}
                  {row.value}
                </span>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
