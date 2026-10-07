"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Progress,
  Spin,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.llm;

interface TaskRow {
  key: string;
  kind: "chat" | "embed";
  label: string;
  model: string;
  model_setting: string | null;
  monthly_token_quota: number | null;
  enabled: boolean;
  used_this_month: number;
  quota_share: number | null;
}

interface Settings {
  mode: "mock" | "gateway";
  defaults: { chat_model: string; embed_model: string };
  tasks: TaskRow[];
  prices: { model: string; input_per_1k: number; output_per_1k: number }[];
}

interface Group {
  key: string | null;
  name?: string | null;
  calls: number;
  tokens: number;
  cost: number;
  errors: number;
}

interface Usage {
  month: string;
  totals: { calls: number; tokens: number; cost: number; errors: number };
  by_task: Group[];
  by_model: Group[];
  by_user: Group[];
  latest: {
    at: string;
    task: string;
    model: string;
    user: string | null;
    tokens: number;
    cost: number | null;
    duration_ms: number;
    status: string;
    error: string | null;
  }[];
}

const num = (value: number) => value.toLocaleString("th-TH");

function GroupTable({ rows, label }: { rows: Group[]; label: string }) {
  return (
    <Table<Group>
      rowKey={(row) => row.key ?? "-"}
      size="small"
      pagination={false}
      dataSource={rows}
      locale={{ emptyText: m.empty }}
      columns={[
        {
          title: label,
          key: "key",
          render: (_: unknown, row) => row.name ?? row.key ?? m.system,
        },
        { title: m.calls, dataIndex: "calls", align: "right", render: num },
        { title: m.tokens, dataIndex: "tokens", align: "right", render: num },
        {
          title: m.cost,
          dataIndex: "cost",
          align: "right",
          render: (value: number) => value.toFixed(2),
        },
        { title: m.errors, dataIndex: "errors", align: "right" },
      ]}
    />
  );
}

/**
 * CD-275 — the LLM Gateway settings: each AI task's model, quota and switch;
 * model prices for the cost estimate; the month's usage; and a test call.
 */
export function LlmAdmin() {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { model: string; quota: number | null; enabled: boolean }>
  >({});
  const [prices, setPrices] = useState<Settings["prices"]>([]);
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf("month"));
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function show(next: Settings) {
    setSettings(next);
    setPrices(next.prices);
    setDrafts(
      Object.fromEntries(
        next.tasks.map((task) => [
          task.key,
          {
            model: task.model_setting ?? "",
            quota: task.monthly_token_quota,
            enabled: task.enabled,
          },
        ]),
      ),
    );
  }

  useEffect(() => {
    let live = true;
    void appApi<Settings>("llm/settings").then((result) => {
      if (!live) return;
      if (result.ok) show(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void appApi<Usage>(`llm/usage?month=${month.format("YYYY-MM")}`).then(
      (result) => {
        if (live && result.ok) setUsage(result.data);
      },
    );
    return () => {
      live = false;
    };
  }, [month]);

  async function saveTask(key: string) {
    const draft = drafts[key];
    setBusy(true);
    const result = await appApi<Settings>(
      `llm/tasks/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          model: draft.model,
          monthly_token_quota: draft.quota,
          enabled: draft.enabled,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    show(result.data);
    message.success(m.saved);
  }

  async function savePrices() {
    setBusy(true);
    const result = await appApi<Settings>("llm/prices", {
      method: "PUT",
      body: JSON.stringify({
        prices: prices.filter((row) => row.model.trim()),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    show(result.data);
    message.success(m.saved);
  }

  async function test() {
    setBusy(true);
    setAnswer(null);
    const result = await appApi<{ text: string; model: string }>("llm/test", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setAnswer(`${result.data.model}: ${result.data.text}`);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!settings) {
    return (
      <div className="py-10 text-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tag color={settings.mode === "gateway" ? "green" : "orange"}>
          {m.mode[settings.mode]}
        </Tag>
        <Text type="secondary" className="text-xs">
          {m.defaults(
            settings.defaults.chat_model,
            settings.defaults.embed_model,
          )}
        </Text>
      </div>

      <Card size="small" title={m.tasksTitle}>
        <Table<TaskRow>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={settings.tasks}
          scroll={{ x: true }}
          columns={[
            {
              title: m.columns.task,
              key: "task",
              render: (_: unknown, row) => (
                <div>
                  <Text strong>{row.label}</Text>
                  <div className="text-xs text-black/50">
                    {row.key} · {m.kinds[row.kind]}
                  </div>
                </div>
              ),
            },
            {
              title: m.columns.model,
              key: "model",
              render: (_: unknown, row) => (
                <Input
                  size="small"
                  className="min-w-40"
                  placeholder={`${m.modelPlaceholder} (${row.model})`}
                  value={drafts[row.key]?.model ?? ""}
                  onChange={(event) =>
                    setDrafts({
                      ...drafts,
                      [row.key]: {
                        ...drafts[row.key],
                        model: event.target.value,
                      },
                    })
                  }
                />
              ),
            },
            {
              title: m.columns.quota,
              key: "quota",
              render: (_: unknown, row) => (
                <InputNumber<number>
                  size="small"
                  min={0}
                  step={100000}
                  className="w-36"
                  placeholder={m.unlimited}
                  value={drafts[row.key]?.quota ?? null}
                  onChange={(value) =>
                    setDrafts({
                      ...drafts,
                      [row.key]: { ...drafts[row.key], quota: value ?? null },
                    })
                  }
                />
              ),
            },
            {
              title: m.columns.used,
              key: "used",
              render: (_: unknown, row) => (
                <div className="min-w-32 text-xs">
                  {num(row.used_this_month)}
                  {row.quota_share !== null && (
                    <Progress
                      size="small"
                      percent={Math.min(100, Math.round(row.quota_share * 100))}
                      status={row.quota_share >= 1 ? "exception" : "normal"}
                    />
                  )}
                </div>
              ),
            },
            {
              title: m.columns.enabled,
              key: "enabled",
              render: (_: unknown, row) => (
                <Switch
                  size="small"
                  checked={drafts[row.key]?.enabled ?? true}
                  onChange={(checked) =>
                    setDrafts({
                      ...drafts,
                      [row.key]: { ...drafts[row.key], enabled: checked },
                    })
                  }
                />
              ),
            },
            {
              key: "save",
              render: (_: unknown, row) => (
                <Button
                  size="small"
                  loading={busy}
                  onClick={() => void saveTask(row.key)}
                >
                  {m.save}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title={m.pricesTitle}>
        <div className="space-y-2">
          {prices.map((row, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                size="small"
                className="w-56"
                placeholder={m.priceModel}
                value={row.model}
                onChange={(event) =>
                  setPrices(
                    prices.map((p, i) =>
                      i === index ? { ...p, model: event.target.value } : p,
                    ),
                  )
                }
              />
              <InputNumber<number>
                size="small"
                min={0}
                step={0.001}
                addonBefore={m.priceIn}
                value={row.input_per_1k}
                onChange={(value) =>
                  setPrices(
                    prices.map((p, i) =>
                      i === index ? { ...p, input_per_1k: value ?? 0 } : p,
                    ),
                  )
                }
              />
              <InputNumber<number>
                size="small"
                min={0}
                step={0.001}
                addonBefore={m.priceOut}
                value={row.output_per_1k}
                onChange={(value) =>
                  setPrices(
                    prices.map((p, i) =>
                      i === index ? { ...p, output_per_1k: value ?? 0 } : p,
                    ),
                  )
                }
              />
              <a
                onClick={() => setPrices(prices.filter((_, i) => i !== index))}
              >
                ✕
              </a>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                setPrices([
                  ...prices,
                  { model: "", input_per_1k: 0, output_per_1k: 0 },
                ])
              }
            >
              {m.addPrice}
            </Button>
            <Button
              size="small"
              type="primary"
              loading={busy}
              onClick={() => void savePrices()}
            >
              {m.savePrices}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        size="small"
        title={m.usageTitle}
        extra={
          <DatePicker
            picker="month"
            allowClear={false}
            value={month}
            format="MM/YYYY"
            onChange={(value) => value && setMonth(value.startOf("month"))}
          />
        }
      >
        {!usage ? (
          <Spin />
        ) : (
          <div className="space-y-4">
            <Text>
              {m.totals(
                usage.totals.calls,
                num(usage.totals.tokens),
                usage.totals.cost.toFixed(2),
                usage.totals.errors,
              )}
            </Text>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <GroupTable rows={usage.by_task} label={m.byTask} />
              <GroupTable rows={usage.by_model} label={m.byModel} />
              <GroupTable rows={usage.by_user} label={m.byUser} />
            </div>
            <Table
              rowKey={(row) => `${row.at}-${row.task}-${row.tokens}`}
              size="small"
              pagination={false}
              dataSource={usage.latest}
              scroll={{ x: true }}
              title={() => <Text strong>{m.latest}</Text>}
              locale={{ emptyText: m.empty }}
              columns={[
                {
                  dataIndex: "at",
                  render: (value: string) =>
                    dayjs(value).format("DD/MM HH:mm:ss"),
                },
                { dataIndex: "task" },
                { dataIndex: "model" },
                {
                  dataIndex: "user",
                  render: (value: string | null) => value ?? m.system,
                },
                { dataIndex: "tokens", align: "right", render: num },
                {
                  dataIndex: "duration_ms",
                  align: "right",
                  render: (value: number) => `${value} ms`,
                },
                {
                  dataIndex: "status",
                  render: (value: string, row) => (
                    <span>
                      <Tag color={value === "ok" ? "success" : "error"}>
                        {m.statuses[value] ?? value}
                      </Tag>
                      {row.error && (
                        <Text type="secondary" className="text-xs">
                          {row.error}
                        </Text>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Card size="small" title={m.testTitle}>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xl"
            value={prompt}
            maxLength={2000}
            placeholder={m.testPlaceholder}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Button
            loading={busy}
            disabled={!prompt.trim()}
            onClick={() => void test()}
          >
            {m.testRun}
          </Button>
        </div>
        {answer && <Alert className="mt-2" type="info" title={answer} />}
      </Card>
    </div>
  );
}
