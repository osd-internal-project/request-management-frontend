"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  InputNumber,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.aiAudit;

interface Person {
  id: string;
  name: string | null;
}

interface McpRow {
  id: string;
  at: string;
  user: Person | null;
  via_service_account: boolean;
  tool: string;
  is_write: boolean;
  args: Record<string, unknown>;
  result_ids: string[];
  result_count: number;
  status: string;
  error_code: string | null;
  duration_ms: number;
}

interface LlmRow {
  id: string;
  at: string;
  user: Person | null;
  task: string;
  kind: string;
  model: string;
  total_tokens: number;
  cost_estimate: number | null;
  status: string;
  error: string | null;
  duration_ms: number;
}

interface Page<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

interface Filters {
  tools: string[];
  tasks: { key: string; label: string }[];
  people: { id: string; name: string }[];
}

type Kind = "mcp" | "llm";

const when = (at: string) => dayjs(at).format("DD/MM/YYYY HH:mm:ss");
const who = (user: Person | null) => user?.name ?? user?.id ?? m.noPerson;
const statusTag = (status: string, code?: string | null) => (
  <Tag color={status === "ok" ? "green" : "red"}>
    {m.status[status] ?? status}
    {code ? ` · ${code}` : ""}
  </Tag>
);

/** What was asked: a read's filters, or a write's field names only. */
function argsText(args: Record<string, unknown>): string {
  if (Array.isArray(args.fields)) return m.fieldsOnly(args.fields as string[]);
  const entries = Object.entries(args);
  if (!entries.length) return "—";
  return entries
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" · ");
}

/** Retention: how many days the company keeps these logs. */
function RetentionCard() {
  const { message } = App.useApp();
  const [days, setDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void appApi<{ retention_days: number }>("ai-audit/policy").then(
      (result) => {
        if (result.ok) setDays(result.data.retention_days);
      },
    );
  }, []);

  async function save() {
    if (days === null) return;
    setBusy(true);
    const result = await appApi<{ retention_days: number }>(
      "ai-audit/policy",
      { method: "PUT", body: JSON.stringify({ retention_days: days }) },
    );
    setBusy(false);
    if (result.ok) message.success(m.policy.saved);
    else message.error(result.message);
  }

  return (
    <Card size="small" title={m.policy.title}>
      <Space wrap>
        <InputNumber
          min={30}
          max={3650}
          value={days}
          onChange={setDays}
          suffix={m.policy.days}
        />
        <Button type="primary" loading={busy} onClick={() => void save()}>
          {m.policy.save}
        </Button>
        <Text type="secondary">{m.policy.hint}</Text>
      </Space>
    </Card>
  );
}

/** One tab: filters, the table, and a row's detail. */
function CallLog({ kind, filters }: { kind: Kind; filters: Filters | null }) {
  const [person, setPerson] = useState<string | undefined>();
  const [name, setName] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<McpRow | LlmRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<McpRow | LlmRow | null>(null);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({
      page: String(page),
      page_size: "50",
    });
    if (person) params.set("user_id", person);
    if (name) params.set("name", name);
    if (status) params.set("status", status);
    if (range?.[0]) params.set("from", range[0].format("YYYY-MM-DD"));
    if (range?.[1]) params.set("to", range[1].format("YYYY-MM-DD"));
    void appApi<Page<McpRow | LlmRow>>(
      `ai-audit/${kind}-calls?${params.toString()}`,
    ).then((result) => {
      if (!live) return;
      if (result.ok) {
        setError(null);
        setData(result.data);
      } else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [kind, person, name, status, range, page]);

  const statuses = kind === "mcp" ? ["ok", "error"] : Object.keys(m.status);
  const names =
    kind === "mcp"
      ? (filters?.tools ?? []).map((tool) => ({ value: tool, label: tool }))
      : (filters?.tasks ?? []).map((task) => ({
          value: task.key,
          label: `${task.label} (${task.key})`,
        }));

  const mcpColumns = [
    { title: m.columns.at, dataIndex: "at", render: when, width: 160 },
    {
      title: m.columns.person,
      key: "person",
      render: (_: unknown, row: McpRow) => (
        <div>
          {who(row.user)}
          {row.via_service_account && (
            <div>
              <Tag>{m.viaKey}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: m.columns.tool,
      key: "tool",
      render: (_: unknown, row: McpRow) => (
        <div>
          <Text code>{row.tool}</Text>
          {row.is_write && <Tag color="orange">{m.write}</Tag>}
        </div>
      ),
    },
    {
      title: m.columns.args,
      key: "args",
      render: (_: unknown, row: McpRow) => (
        <Text className="text-xs">{argsText(row.args)}</Text>
      ),
    },
    {
      title: m.columns.result,
      dataIndex: "result_count",
      align: "right" as const,
      render: (count: number) => m.resultCount(count),
    },
    {
      title: m.columns.status,
      key: "status",
      render: (_: unknown, row: McpRow) => statusTag(row.status, row.error_code),
    },
  ];

  const llmColumns = [
    { title: m.columns.at, dataIndex: "at", render: when, width: 160 },
    {
      title: m.columns.person,
      key: "person",
      render: (_: unknown, row: LlmRow) => who(row.user),
    },
    { title: m.columns.task, dataIndex: "task" },
    { title: m.columns.model, dataIndex: "model" },
    {
      title: m.columns.tokens,
      dataIndex: "total_tokens",
      align: "right" as const,
      render: (value: number) => value.toLocaleString("th-TH"),
    },
    {
      title: m.columns.cost,
      dataIndex: "cost_estimate",
      align: "right" as const,
      render: (value: number | null) =>
        value === null ? "—" : value.toLocaleString("th-TH"),
    },
    {
      title: m.columns.status,
      key: "status",
      render: (_: unknown, row: LlmRow) => statusTag(row.status),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-56"
          placeholder={m.filters.person}
          value={person}
          onChange={(value) => {
            setPerson(value);
            setPage(1);
          }}
          options={(filters?.people ?? []).map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />
        <Select
          allowClear
          showSearch
          className="w-64"
          placeholder={kind === "mcp" ? m.filters.tool : m.filters.task}
          value={name}
          onChange={(value) => {
            setName(value);
            setPage(1);
          }}
          options={names}
        />
        <Select
          allowClear
          className="w-36"
          placeholder={m.filters.status}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={statuses.map((value) => ({
            value,
            label: m.status[value],
          }))}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={range}
          onChange={(value) => {
            setRange(value);
            setPage(1);
          }}
        />
      </div>

      {error && <Alert type="error" showIcon title={error} />}

      <Table<McpRow | LlmRow>
        rowKey="id"
        size="small"
        loading={!data && !error}
        dataSource={data?.data ?? []}
        columns={(kind === "mcp" ? mcpColumns : llmColumns) as never}
        scroll={{ x: true }}
        locale={{ emptyText: m.empty }}
        onRow={(row) => ({ onClick: () => setOpen(row) })}
        rowClassName="cursor-pointer"
        pagination={{
          current: page,
          pageSize: 50,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Drawer
        open={open !== null}
        size={640}
        title={m.detail}
        onClose={() => setOpen(null)}
        destroyOnHidden
      >
        {open && kind === "mcp" && <McpDetail row={open as McpRow} />}
        {open && kind === "llm" && <LlmDetail row={open as LlmRow} />}
      </Drawer>
    </div>
  );
}

function McpDetail({ row }: { row: McpRow }) {
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={m.columns.at}>{when(row.at)}</Descriptions.Item>
      <Descriptions.Item label={m.columns.person}>
        {who(row.user)} {row.via_service_account && <Tag>{m.viaKey}</Tag>}
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.tool}>
        <Text code>{row.tool}</Text>
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.args}>
        <pre className="m-0 text-xs whitespace-pre-wrap">
          {JSON.stringify(row.args, null, 2)}
        </pre>
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.result}>
        {m.resultCount(row.result_count)}
      </Descriptions.Item>
      <Descriptions.Item label={m.resultIds}>
        {row.result_ids.length ? (
          <div className="flex flex-wrap gap-1">
            {row.result_ids.map((id) => (
              <Text key={id} code className="text-xs">
                {id}
              </Text>
            ))}
          </div>
        ) : (
          "—"
        )}
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.status}>
        {statusTag(row.status, row.error_code)}
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.duration}>
        {row.duration_ms.toLocaleString("th-TH")}
      </Descriptions.Item>
    </Descriptions>
  );
}

function LlmDetail({ row }: { row: LlmRow }) {
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={m.columns.at}>{when(row.at)}</Descriptions.Item>
      <Descriptions.Item label={m.columns.person}>{who(row.user)}</Descriptions.Item>
      <Descriptions.Item label={m.columns.task}>
        {row.task} ({row.kind})
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.model}>{row.model}</Descriptions.Item>
      <Descriptions.Item label={m.columns.tokens}>
        {row.total_tokens.toLocaleString("th-TH")}
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.cost}>
        {row.cost_estimate ?? "—"}
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.status}>
        {statusTag(row.status)}
        {row.error && <div className="text-xs">{row.error}</div>}
      </Descriptions.Item>
      <Descriptions.Item label={m.columns.duration}>
        {row.duration_ms.toLocaleString("th-TH")}
      </Descriptions.Item>
    </Descriptions>
  );
}

/**
 * CD-279 — who asked the AI what, and which records answered. Rows hold ids
 * and counts, never the records' values; the chat's text stays in LibreChat.
 */
export function AiAudit() {
  const [filters, setFilters] = useState<Filters | null>(null);

  useEffect(() => {
    void appApi<Filters>("ai-audit/filters").then((result) => {
      if (result.ok) setFilters(result.data);
    });
  }, []);

  return (
    <div className="space-y-4">
      <RetentionCard />
      <Card size="small">
        <Tabs
          destroyOnHidden
          items={(["mcp", "llm"] as const).map((kind) => ({
            key: kind,
            label: m.tabs[kind],
            children: <CallLog kind={kind} filters={filters} />,
          }))}
        />
      </Card>
    </div>
  );
}
