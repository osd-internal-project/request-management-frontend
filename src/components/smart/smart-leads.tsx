"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { AddToCallList, CallLists, CallPolicy, OptOuts } from "./smart-calls";
import { SmartResults } from "./smart-results";

const m = messages.aiSmart;

const KINDS = ["dbd", "web", "social", "push", "file"] as const;
const CONNECTOR_KINDS = ["dbd", "web", "social"];
const AXES = ["getter", "government", "partner", "keeper"] as const;
const STATUSES = ["new", "screened", "sent", "discarded"] as const;
/** Mirrors the backend's weak line (`smart-scoring.ts`). */
const WEAK_SCORE = 40;

interface Criteria {
  keywords?: string[];
  industries?: string[];
  provinces?: string[];
  minCapital?: number;
  maxResults?: number;
}

interface Source {
  id: string;
  code: string;
  name: string;
  kind: string;
  sales_axis: string | null;
  criteria: Criteria;
  interval_hours: number | null;
  active: boolean;
  last_run_at: string | null;
  prospects: { total: number; new: number };
}

interface Prospect {
  id: string;
  source_id: string;
  external_ref: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  industry: string | null;
  province: string | null;
  registered_capital: number | null;
  sales_axis: string | null;
  evidence: Record<string, unknown>;
  status: string;
  discard_reason: string | null;
  created_at: string;
  score: number | null;
  score_reasons: { label: string; points: number }[];
  ai_summary: string | null;
  match_kind: string | null;
  lead_id: string | null;
  sent_outcome: string | null;
  interested_at: string | null;
  handoff_axis: string | null;
  handed_off_at: string | null;
  handoff_error: string | null;
  keeper_opportunity_id: string | null;
  handoff_request: { id: string; request_no: string | null; status: string } | null;
}

interface Run {
  id: string;
  source_id: string;
  trigger: string;
  status: string;
  found: number;
  added: number;
  duplicates: number;
  rejected: number;
  error: string | null;
  started_at: string;
}

interface Outcome {
  found: number;
  added: number;
  duplicates: number;
  rejected: number;
  problems: { row: number; reason: string }[];
}

const when = (at: string | null) =>
  at ? dayjs(at).format("DD/MM/YYYY HH:mm") : "—";
const baht = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("th-TH");
const statusColor: Record<string, string> = {
  new: "blue",
  screened: "cyan",
  sent: "green",
  discarded: "default",
};

/** Excel header (Thai or English) → row field. */
const HEADER_MAP: Record<string, string> = {
  ชื่อ: "name",
  name: "name",
  เลขนิติบุคคล: "tax_id",
  tax_id: "tax_id",
  โทร: "phone",
  phone: "phone",
  อีเมล: "email",
  email: "email",
  เว็บไซต์: "website",
  website: "website",
  ประเภทธุรกิจ: "industry",
  industry: "industry",
  จังหวัด: "province",
  province: "province",
  ทุนจดทะเบียน: "registered_capital",
  registered_capital: "registered_capital",
  รหัสอ้างอิง: "external_ref",
  external_ref: "external_ref",
};

async function readRows(file: File): Promise<Record<string, string>[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new Error(m.importEmpty);
  const fieldOf = new Map<number, string>();
  sheet.getRow(1).eachCell((cell, col) => {
    const field = HEADER_MAP[cell.text.trim()];
    if (field) fieldOf.set(col, field);
  });
  if (![...fieldOf.values()].includes("name")) throw new Error(m.importNoName);
  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const record: Record<string, string> = {};
    fieldOf.forEach((field, col) => {
      const text = row.getCell(col).text?.trim();
      if (text) record[field] = text;
    });
    if (Object.keys(record).length) rows.push(record);
  });
  if (!rows.length) throw new Error(m.importEmpty);
  return rows;
}

// --- sources --------------------------------------------------------------------

function SourceForm({
  source,
  open,
  onClose,
  onSaved,
}: {
  source: Source | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const kind = Form.useWatch("kind", form) as string | undefined;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      source
        ? {
            code: source.code,
            name: source.name,
            kind: source.kind,
            sales_axis: source.sales_axis ?? undefined,
            keywords: source.criteria.keywords ?? [],
            industries: source.criteria.industries ?? [],
            provinces: source.criteria.provinces ?? [],
            minCapital: source.criteria.minCapital,
            maxResults: source.criteria.maxResults,
            interval_hours: source.interval_hours ?? undefined,
            active: source.active,
          }
        : { kind: "dbd", active: true, keywords: [], provinces: [] },
    );
  }, [open, source, form]);

  async function save() {
    const values = (await form.validateFields()) as Record<string, unknown>;
    const connector = CONNECTOR_KINDS.includes(values.kind as string);
    const body = {
      code: values.code,
      name: values.name,
      kind: values.kind,
      sales_axis: values.sales_axis ?? null,
      criteria: connector
        ? {
            keywords: values.keywords,
            industries: values.industries,
            provinces: values.provinces,
            minCapital: values.minCapital ?? undefined,
            maxResults: values.maxResults ?? undefined,
          }
        : {},
      interval_hours: connector ? (values.interval_hours ?? null) : null,
      active: values.active,
    };
    setBusy(true);
    const result = await appApi(
      source ? `smart/sources/${source.id}` : "smart/sources",
      { method: source ? "PUT" : "POST", body: JSON.stringify(body) },
    );
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    onSaved();
    onClose();
  }

  const tags = { mode: "tags" as const, tokenSeparators: [","], open: false };

  return (
    <Modal
      open={open}
      title={source ? m.editSource : m.addSource}
      onCancel={onClose}
      onOk={() => void save()}
      okText={m.form.save}
      confirmLoading={busy}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="code" label={m.form.code} rules={[{ required: true }]}>
          <Input maxLength={40} />
        </Form.Item>
        <Form.Item name="name" label={m.form.name} rules={[{ required: true }]}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="kind" label={m.form.kind} rules={[{ required: true }]}>
          <Select
            options={KINDS.map((value) => ({ value, label: m.kinds[value] }))}
          />
        </Form.Item>
        <Form.Item name="sales_axis" label={m.form.axis}>
          <Select
            allowClear
            options={AXES.map((value) => ({ value, label: m.axes[value] }))}
          />
        </Form.Item>
        {kind && CONNECTOR_KINDS.includes(kind) && (
          <>
            <Form.Item name="keywords" label={m.form.keywords}>
              <Select {...tags} />
            </Form.Item>
            <Form.Item name="industries" label={m.form.industries}>
              <Select {...tags} />
            </Form.Item>
            <Form.Item name="provinces" label={m.form.provinces}>
              <Select {...tags} />
            </Form.Item>
            <Space wrap>
              <Form.Item name="minCapital" label={m.form.minCapital}>
                <InputNumber min={0} className="w-48" />
              </Form.Item>
              <Form.Item name="maxResults" label={m.form.maxResults}>
                <InputNumber min={1} max={200} />
              </Form.Item>
              <Form.Item name="interval_hours" label={m.form.interval}>
                <InputNumber min={1} max={2160} />
              </Form.Item>
            </Space>
          </>
        )}
        {kind === "push" && form.getFieldValue("code") && (
          <Alert
            type="info"
            showIcon
            title={m.pushHint(String(form.getFieldValue("code")))}
            className="mb-3"
          />
        )}
        <Form.Item name="active" label={m.form.active} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function Sources({
  sources,
  canManage,
  reload,
}: {
  sources: Source[];
  canManage: boolean;
  reload: () => void;
}) {
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState<Source | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  function report(outcome: Outcome) {
    modal.info({
      title: m.runResult(outcome),
      content: outcome.problems.length ? (
        <ul className="m-0 pl-4 text-xs">
          {outcome.problems.map((p) => (
            <li key={p.row}>
              #{p.row}: {p.reason}
            </li>
          ))}
        </ul>
      ) : undefined,
    });
  }

  async function run(source: Source) {
    setBusy(source.id);
    const result = await appApi<Outcome>(`smart/sources/${source.id}/run`, {
      method: "POST",
    });
    setBusy(null);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    report(result.data);
    reload();
  }

  async function importFile(source: Source, file: File) {
    setBusy(source.id);
    try {
      const rows = await readRows(file);
      const result = await appApi<Outcome>(
        `smart/sources/${source.id}/import`,
        { method: "POST", body: JSON.stringify({ rows }) },
      );
      if (!result.ok) message.error(result.message);
      else {
        report(result.data);
        reload();
      }
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          {m.addSource}
        </Button>
      )}
      <Table<Source>
        rowKey="id"
        size="small"
        dataSource={sources}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: m.noSources }}
        columns={[
          {
            title: m.columns.source,
            key: "name",
            render: (_: unknown, row) => (
              <div>
                <Text strong>{row.name}</Text>
                <div className="text-xs">
                  <Text type="secondary">{row.code}</Text>{" "}
                  {!row.active && <Tag>off</Tag>}
                </div>
              </div>
            ),
          },
          {
            title: m.columns.kind,
            dataIndex: "kind",
            render: (kind: string) => m.kinds[kind] ?? kind,
          },
          {
            title: m.columns.axis,
            dataIndex: "sales_axis",
            render: (axis: string | null) => (axis ? m.axes[axis] : "—"),
          },
          {
            title: m.columns.interval,
            dataIndex: "interval_hours",
            render: (hours: number | null, row) =>
              CONNECTOR_KINDS.includes(row.kind)
                ? hours
                  ? m.everyHours(hours)
                  : m.byHand
                : "—",
          },
          {
            title: m.columns.lastRun,
            dataIndex: "last_run_at",
            render: when,
          },
          {
            title: m.columns.count,
            key: "count",
            align: "right",
            render: (_: unknown, row) =>
              `${row.prospects.total.toLocaleString("th-TH")} (${row.prospects.new.toLocaleString("th-TH")})`,
          },
          ...(canManage
            ? [
                {
                  key: "actions",
                  render: (_: unknown, row: Source) => (
                    <Space wrap>
                      {CONNECTOR_KINDS.includes(row.kind) && (
                        <Button
                          size="small"
                          loading={busy === row.id}
                          disabled={!row.active}
                          onClick={() => void run(row)}
                        >
                          {m.run}
                        </Button>
                      )}
                      {row.kind === "file" && (
                        <Upload
                          accept=".xlsx"
                          showUploadList={false}
                          disabled={!row.active}
                          beforeUpload={(file) => {
                            void importFile(row, file);
                            return false;
                          }}
                        >
                          <Button
                            size="small"
                            icon={<UploadOutlined />}
                            loading={busy === row.id}
                            title={m.importHint}
                          >
                            {m.import}
                          </Button>
                        </Upload>
                      )}
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        {m.editSource}
                      </Button>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      <Text type="secondary" className="block text-xs">
        {m.importHint}
      </Text>
      <SourceForm
        source={editing}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}

// --- prospects ------------------------------------------------------------------

function Prospects({
  sources,
  canManage,
  canCall,
  version,
  onChanged,
}: {
  sources: Source[];
  canManage: boolean;
  canCall: boolean;
  version: number;
  onChanged: () => void;
}) {
  const { message, modal } = App.useApp();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [axis, setAxis] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>("screened");
  const [minScore, setMinScore] = useState<number | null>(null);
  const [match, setMatch] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ data: Prospect[]; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Prospect | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ page: String(page), page_size: "50" });
    if (search) params.set("q", search);
    if (sourceId) params.set("source_id", sourceId);
    if (axis) params.set("sales_axis", axis);
    if (status) params.set("status", status);
    if (minScore !== null) params.set("min_score", String(minScore));
    if (match) params.set("match_kind", match);
    void appApi<{ data: Prospect[]; total: number }>(
      `smart/prospects?${params.toString()}`,
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
  }, [search, sourceId, axis, status, minScore, match, page, version, tick]);

  const sourceName = (id: string) =>
    sources.find((source) => source.id === id)?.name ?? "—";

  async function act(row: Prospect, action: "discard" | "reopen", reason?: string) {
    const result = await appApi<Prospect>(`smart/prospects/${row.id}/${action}`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setOpen(null);
    setTick((n) => n + 1);
    onChanged();
  }

  /** CD-290 — into CRM through the campaign screening; one row or many. */
  async function send(ids: string[]) {
    setBusy(true);
    const result = await appApi<
      { id: string; name: string; outcome: string; reason?: string }[]
    >("smart/prospects/send", { method: "POST", body: JSON.stringify({ ids }) });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    modal.info({
      title: m.sent(result.data.filter((r) => r.outcome !== "skipped").length),
      content: (
        <ul className="m-0 pl-4 text-xs">
          {result.data.map((r) => (
            <li key={r.id}>
              {r.name} — {m.outcome[r.outcome] ?? r.outcome}
              {r.reason ? ` (${r.reason})` : ""}
            </li>
          ))}
        </ul>
      ),
    });
    setSelected([]);
    setOpen(null);
    setTick((n) => n + 1);
    onChanged();
  }

  /** CD-293 — to the sales axis: a Lead for its team + the handoff request. */
  function handOff(ids: string[]) {
    let axis: string | undefined;
    modal.confirm({
      title: m.handoff.title(ids.length),
      content: (
        <div className="space-y-2">
          <Text type="secondary" className="block text-xs">
            {m.handoff.hint}
          </Text>
          <Select
            allowClear
            className="w-full"
            placeholder={m.handoff.ownAxis}
            onChange={(value: string | undefined) => {
              axis = value;
            }}
            options={(["getter", "government", "partner"] as const).map((value) => ({
              value,
              label: m.axes[value],
            }))}
          />
        </div>
      ),
      onOk: async () => {
        const result = await appApi<
          { id: string; name: string; outcome: string; reason?: string }[]
        >("smart/prospects/handoff", {
          method: "POST",
          body: JSON.stringify({ ids, ...(axis ? { axis } : {}) }),
        });
        if (!result.ok) {
          message.error(result.message);
          return;
        }
        modal.info({
          title: m.handoff.done(
            result.data.filter((r) => r.outcome === "handed_off").length,
          ),
          content: (
            <ul className="m-0 pl-4 text-xs">
              {result.data.map((r) => (
                <li key={r.id}>
                  {r.name} — {m.handoff.outcomes[r.outcome] ?? r.outcome}
                  {r.reason ? ` (${r.reason})` : ""}
                </li>
              ))}
            </ul>
          ),
        });
        setSelected([]);
        setOpen(null);
        setTick((n) => n + 1);
        onChanged();
      },
    });
  }

  /** CD-294 — existing customers to their account owners. */
  function toKeeper(ids: string[]) {
    modal.confirm({
      title: m.handoff.keeperTitle(ids.length),
      content: m.handoff.keeperHint,
      onOk: async () => {
        const result = await appApi<
          { id: string; name: string; outcome: string; reason?: string }[]
        >("smart/prospects/keeper", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        if (!result.ok) {
          message.error(result.message);
          return;
        }
        modal.info({
          title: m.handoff.keeperDone(
            result.data.filter((r) => r.outcome === "sent").length,
          ),
          content: (
            <ul className="m-0 pl-4 text-xs">
              {result.data.map((r) => (
                <li key={r.id}>
                  {r.name} — {m.handoff.keeperOutcomes[r.outcome] ?? r.outcome}
                  {r.reason ? ` (${r.reason})` : ""}
                </li>
              ))}
            </ul>
          ),
        });
        setSelected([]);
        setOpen(null);
        setTick((n) => n + 1);
        onChanged();
      },
    });
  }

  async function rescreen() {
    setBusy(true);
    const result = await appApi<{ screened: number }>("smart/prospects/screen", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!result.ok) message.error(result.message);
    else {
      message.success(m.rescreened(result.data.screened));
      setTick((n) => n + 1);
      onChanged();
    }
  }

  function discard(row: Prospect) {
    let reason = "";
    modal.confirm({
      title: `${m.discard}: ${row.name}`,
      content: (
        <Input.TextArea
          rows={3}
          placeholder={m.discardReason}
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      onOk: () => (reason.trim() ? act(row, "discard", reason.trim()) : Promise.reject()),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input.Search
          allowClear
          className="w-72"
          placeholder={m.filters.search}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="w-56"
          placeholder={m.filters.source}
          value={sourceId}
          onChange={(value) => {
            setSourceId(value);
            setPage(1);
          }}
          options={sources.map((source) => ({ value: source.id, label: source.name }))}
        />
        <Select
          allowClear
          className="w-52"
          placeholder={m.filters.axis}
          value={axis}
          onChange={(value) => {
            setAxis(value);
            setPage(1);
          }}
          options={AXES.map((value) => ({ value, label: m.axes[value] }))}
        />
        <Select
          allowClear
          className="w-40"
          placeholder={m.filters.status}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={STATUSES.map((value) => ({ value, label: m.status[value] }))}
        />
        <InputNumber
          min={0}
          max={100}
          placeholder={m.filters.minScore}
          value={minScore}
          onChange={(value) => {
            setMinScore(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="w-44"
          placeholder={m.filters.match}
          value={match}
          onChange={(value) => {
            setMatch(value);
            setPage(1);
          }}
          options={(["none", "customer", "lead"] as const).map((value) => ({
            value,
            label: m.match[value],
          }))}
        />
      </div>

      {canManage && (
        <Space wrap>
          <Button
            type="primary"
            disabled={!selected.length}
            loading={busy}
            onClick={() => void send(selected)}
          >
            {m.sendSelected(selected.length)}
          </Button>
          <Button disabled={!selected.length} onClick={() => handOff(selected)}>
            {m.handoff.button(selected.length)}
          </Button>
          <Button disabled={!selected.length} onClick={() => toKeeper(selected)}>
            {m.handoff.keeperButton(selected.length)}
          </Button>
          <Button loading={busy} onClick={() => void rescreen()}>
            {m.rescreen}
          </Button>
          {canCall && (
            <AddToCallList
              prospectIds={selected}
              onDone={() => {
                setSelected([]);
                onChanged();
              }}
            />
          )}
        </Space>
      )}

      {error && <Alert type="error" showIcon title={error} />}

      <Table<Prospect>
        rowKey="id"
        size="small"
        loading={!data && !error}
        dataSource={data?.data ?? []}
        scroll={{ x: true }}
        locale={{ emptyText: m.empty }}
        onRow={(row) => ({ onClick: () => setOpen(row) })}
        rowClassName="cursor-pointer"
        rowSelection={
          canManage
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys as string[]),
                getCheckboxProps: (row) => ({
                  disabled: row.status === "sent" || row.status === "discarded",
                }),
              }
            : undefined
        }
        pagination={{
          current: page,
          pageSize: 50,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        columns={[
          {
            title: m.columns.name,
            key: "name",
            render: (_: unknown, row) => (
              <div>
                <Text strong>{row.name}</Text>
                {row.evidence.mock === true && (
                  <Tag color="gold" className="ml-1">
                    {m.mockTag}
                  </Tag>
                )}
                {row.interested_at && (
                  <Tag color="green" className="ml-1">
                    {m.interestedTag}
                  </Tag>
                )}
                {row.handoff_axis && (
                  <Tag color="purple" className="ml-1">
                    {m.handoff.tag(m.axes[row.handoff_axis] ?? row.handoff_axis)}
                    {row.handoff_request
                      ? ` · ${row.handoff_request.request_no ?? ""} ${m.handoff.requestStatus[row.handoff_request.status] ?? row.handoff_request.status}`
                      : ""}
                  </Tag>
                )}
                {row.handoff_error && (
                  <Tag color="red" className="ml-1" title={row.handoff_error}>
                    {m.handoff.failed}
                  </Tag>
                )}
                <div className="text-xs">
                  <Text type="secondary">{row.industry ?? ""}</Text>
                </div>
              </div>
            ),
          },
          {
            title: m.columns.score,
            dataIndex: "score",
            align: "right",
            render: (value: number | null) =>
              value === null ? (
                "—"
              ) : (
                <Tag color={value >= 70 ? "green" : value >= WEAK_SCORE ? "blue" : "default"}>
                  {value}
                </Tag>
              ),
          },
          {
            title: m.columns.match,
            dataIndex: "match_kind",
            render: (value: string | null) =>
              value && value !== "none" ? (
                <Tag color={value === "customer" ? "purple" : "orange"}>
                  {m.match[value]}
                </Tag>
              ) : (
                "—"
              ),
          },
          { title: m.columns.taxId, dataIndex: "tax_id", render: (v: string | null) => v ?? "—" },
          {
            title: m.columns.contact,
            key: "contact",
            render: (_: unknown, row) => (
              <div className="text-xs">
                {row.phone && <div>{row.phone}</div>}
                {row.email && <div>{row.email}</div>}
                {row.website && <div className="max-w-56 truncate">{row.website}</div>}
              </div>
            ),
          },
          { title: m.columns.province, dataIndex: "province", render: (v: string | null) => v ?? "—" },
          {
            title: m.columns.capital,
            dataIndex: "registered_capital",
            align: "right",
            render: baht,
          },
          {
            title: m.columns.axis,
            dataIndex: "sales_axis",
            render: (value: string | null) => (value ? m.axes[value] : "—"),
          },
          {
            title: m.columns.source,
            dataIndex: "source_id",
            render: sourceName,
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            render: (value: string) => (
              <Tag color={statusColor[value]}>{m.status[value] ?? value}</Tag>
            ),
          },
          { title: m.columns.foundAt, dataIndex: "created_at", render: when },
        ]}
      />

      <Drawer
        open={open !== null}
        size={600}
        title={open?.name}
        onClose={() => setOpen(null)}
        destroyOnHidden
        extra={
          open &&
          canManage && (
            <Space>
              {open.match_kind === "customer" && !open.keeper_opportunity_id && open.status !== "discarded" && (
                <Button onClick={() => toKeeper([open.id])}>{m.handoff.keeperSingle}</Button>
              )}
              {!open.handoff_axis && open.match_kind !== "customer" && open.status !== "discarded" && open.status !== "new" && (
                <Button onClick={() => handOff([open.id])}>{m.handoff.single}</Button>
              )}
              {(open.status === "new" || open.status === "screened") && (
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() => void send([open.id])}
                >
                  {m.send}
                </Button>
              )}
              {open.status === "discarded" ? (
                <Button onClick={() => void act(open, "reopen")}>{m.reopen}</Button>
              ) : open.status !== "sent" ? (
                <Button danger onClick={() => discard(open)}>
                  {m.discard}
                </Button>
              ) : null}
            </Space>
          )
        }
      >
        {open && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={m.columns.score}>
              {open.score === null ? (
                "—"
              ) : (
                <div>
                  <Text strong>{open.score}/100</Text>
                  <ul className="m-0 pl-4 text-xs">
                    {open.score_reasons.map((reason) => (
                      <li key={reason.label}>
                        {reason.points >= 0 ? "+" : ""}
                        {reason.points} {reason.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Descriptions.Item>
            {open.ai_summary && (
              <Descriptions.Item label={m.aiSummary}>{open.ai_summary}</Descriptions.Item>
            )}
            <Descriptions.Item label={m.columns.match}>
              {open.match_kind ? m.match[open.match_kind] : "—"}
            </Descriptions.Item>
            {open.keeper_opportunity_id && (
              <Descriptions.Item label={m.handoff.keeperDeal}>
                <Link href={ROUTES.opportunityDetail(open.keeper_opportunity_id)}>
                  {m.handoff.keeperDeal}
                </Link>
              </Descriptions.Item>
            )}
            {(open.handoff_axis || open.handoff_error) && (
              <Descriptions.Item label={m.handoff.label}>
                {open.handoff_axis && (
                  <div>
                    {m.axes[open.handoff_axis] ?? open.handoff_axis}
                    {open.handoff_request && (
                      <>
                        {" · "}
                        <Link href={ROUTES.requestDetail(open.handoff_request.id)}>
                          {open.handoff_request.request_no ?? m.handoff.request}
                        </Link>{" "}
                        <Tag>
                          {m.handoff.requestStatus[open.handoff_request.status] ??
                            open.handoff_request.status}
                        </Tag>
                      </>
                    )}
                  </div>
                )}
                {open.handoff_error && (
                  <Text type="danger" className="text-xs">
                    {open.handoff_error}
                  </Text>
                )}
              </Descriptions.Item>
            )}
            {open.lead_id && (
              <Descriptions.Item label={m.lead}>
                <Link href={ROUTES.leadDetail(open.lead_id)}>
                  {m.outcome[open.sent_outcome ?? ""] ?? m.openLead}
                </Link>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={m.columns.taxId}>{open.tax_id ?? "—"}</Descriptions.Item>
            <Descriptions.Item label={m.columns.contact}>
              {[open.phone, open.email, open.website].filter(Boolean).join(" · ") || "—"}
            </Descriptions.Item>
            <Descriptions.Item label={m.columns.province}>{open.province ?? "—"}</Descriptions.Item>
            <Descriptions.Item label={m.columns.capital}>
              {baht(open.registered_capital)}
            </Descriptions.Item>
            <Descriptions.Item label={m.columns.axis}>
              {open.sales_axis ? m.axes[open.sales_axis] : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={m.columns.source}>
              {sourceName(open.source_id)} · <Text code>{open.external_ref}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={m.columns.status}>
              <Tag color={statusColor[open.status]}>{m.status[open.status]}</Tag>
              {open.discard_reason && (
                <div className="text-xs">{open.discard_reason}</div>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={m.evidence}>
              <pre className="m-0 text-xs whitespace-pre-wrap">
                {JSON.stringify(open.evidence, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}

// --- runs -----------------------------------------------------------------------

function Runs({ sources, version }: { sources: Source[]; version: number }) {
  const [runs, setRuns] = useState<Run[] | null>(null);

  useEffect(() => {
    void appApi<Run[]>("smart/runs").then((result) => {
      if (result.ok) setRuns(result.data);
    });
  }, [version]);

  return (
    <Table<Run>
      rowKey="id"
      size="small"
      loading={runs === null}
      dataSource={runs ?? []}
      pagination={{ pageSize: 50, hideOnSinglePage: true }}
      scroll={{ x: true }}
      columns={[
        { title: m.columns.startedAt, dataIndex: "started_at", render: when },
        {
          title: m.columns.source,
          dataIndex: "source_id",
          render: (id: string) => sources.find((s) => s.id === id)?.name ?? "—",
        },
        {
          title: m.columns.kind,
          dataIndex: "trigger",
          render: (value: string) => m.trigger[value] ?? value,
        },
        { title: m.columns.found, dataIndex: "found", align: "right" },
        { title: m.columns.added, dataIndex: "added", align: "right" },
        { title: m.columns.duplicates, dataIndex: "duplicates", align: "right" },
        { title: m.columns.rejected, dataIndex: "rejected", align: "right" },
        {
          title: m.columns.result,
          key: "result",
          render: (_: unknown, row) =>
            row.status === "ok" ? (
              <Tag color="green">ok</Tag>
            ) : (
              <Tag color={row.status === "error" ? "red" : "blue"} title={row.error ?? ""}>
                {row.status}
              </Tag>
            ),
        },
      ]}
    />
  );
}

/**
 * CD-289 (CD-16 AI SMART) — sources to sweep, what they found (held outside
 * CRM until screening), and the history of sweeps.
 */
export function SmartLeads({
  canManage,
  canCall,
  canCertify,
  canOptOut,
}: {
  canManage: boolean;
  canCall: boolean;
  canCertify: boolean;
  canOptOut: boolean;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // A change anywhere bumps the version; the sources and every tab reload.
  const reload = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    void appApi<Source[]>("smart/sources").then((result) => {
      if (!live) return;
      if (result.ok) {
        setError(null);
        setSources(result.data);
      } else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [version]);

  return (
    <Card size="small">
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Tabs
        items={[
          {
            key: "prospects",
            label: m.tabs.prospects,
            children: (
              <Prospects
                sources={sources}
                canManage={canManage}
                canCall={canCall}
                version={version}
                onChanged={reload}
              />
            ),
          },
          {
            key: "sources",
            label: m.tabs.sources,
            children: (
              <Sources sources={sources} canManage={canManage} reload={reload} />
            ),
          },
          {
            key: "runs",
            label: m.tabs.runs,
            children: <Runs sources={sources} version={version} />,
          },
          // CD-291 — call lists, the calling policy, the do-not-contact register
          {
            key: "calls",
            label: m.tabs.calls,
            children: <CallLists canManage={canCall} version={version} />,
          },
          {
            key: "policy",
            label: m.tabs.policy,
            children: <CallPolicy canManage={canCall} canCertify={canCertify} />,
          },
          ...(canOptOut
            ? [{ key: "optouts", label: m.tabs.optOuts, children: <OptOuts /> }]
            : []),
          // CD-295 — from sweep to closed sale
          {
            key: "results",
            label: m.tabs.results,
            children: <SmartResults sources={sources} />,
          },
        ]}
      />
    </Card>
  );
}
