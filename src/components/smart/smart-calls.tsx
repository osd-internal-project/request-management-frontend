"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.aiSmart.calls;

const when = (at: string | null) =>
  at ? dayjs(at).format("DD/MM/YYYY HH:mm") : "—";

interface CallWindow {
  day: number;
  from: string;
  to: string;
}

interface Policy {
  windows: CallWindow[];
  max_attempts: number;
  min_gap_days: number;
  opening_script: string;
  optout_script: string;
  opening_preview: string;
  saved: boolean;
  certified: boolean;
  certified_at: string | null;
  certified_note: string | null;
}

export interface CallList {
  id: string;
  name: string;
  script: string;
  kb_article_ids: string[];
  status: string;
  created_at: string;
  targets: Record<string, number>;
}

interface Target {
  id: string;
  name: string;
  phone: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  last_outcome: string | null;
  hold: string | null;
  hold_label: string | null;
}

interface Article {
  id: string;
  articleNo: string;
  title: string;
}

const listColor: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  closed: "default",
};

// --- policy ---------------------------------------------------------------------

/** Each weekday on or off, with its hours. */
type DayRow = { on: boolean; from: Dayjs; to: Dayjs };

function toRows(windows: CallWindow[]): DayRow[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => {
    const window = windows.find((w) => w.day === day);
    return {
      on: !!window,
      from: dayjs(window?.from ?? "09:00", "HH:mm"),
      to: dayjs(window?.to ?? "18:00", "HH:mm"),
    };
  });
}

export function CallPolicy({
  canManage,
  canCertify,
}: {
  canManage: boolean;
  canCertify: boolean;
}) {
  const { message, modal } = App.useApp();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<Policy>("smart/call-policy").then((result) => {
      if (!live || !result.ok) return;
      setPolicy(result.data);
      setDays(toRows(result.data.windows));
      form.setFieldsValue({
        max_attempts: result.data.max_attempts,
        min_gap_days: result.data.min_gap_days,
        opening_script: result.data.opening_script,
        optout_script: result.data.optout_script,
      });
    });
    return () => {
      live = false;
    };
  }, [tick, form]);

  async function save() {
    const values = (await form.validateFields()) as Record<string, unknown>;
    const windows = days.flatMap((row, index) =>
      row.on
        ? [{ day: index + 1, from: row.from.format("HH:mm"), to: row.to.format("HH:mm") }]
        : [],
    );
    setBusy(true);
    const result = await appApi<Policy>("smart/call-policy", {
      method: "PUT",
      body: JSON.stringify({ ...values, windows }),
    });
    setBusy(false);
    if (!result.ok) message.error(result.message);
    else {
      message.success(m.policySaved);
      setTick((n) => n + 1);
    }
  }

  function certify() {
    let note = "";
    modal.confirm({
      title: m.certifyTitle,
      content: (
        <div className="space-y-2">
          <Text>{policy?.opening_preview}</Text>
          <Input.TextArea
            rows={3}
            placeholder={m.certifyNote}
            onChange={(event) => {
              note = event.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        const result = await appApi<Policy>("smart/call-policy/certify", {
          method: "POST",
          body: JSON.stringify({ note }),
        });
        if (!result.ok) message.error(result.message);
        else setTick((n) => n + 1);
      },
    });
  }

  if (!policy) return null;
  return (
    <div className="space-y-3">
      {policy.certified ? (
        <Alert
          type="success"
          showIcon
          title={m.certifiedAt(when(policy.certified_at))}
          description={policy.certified_note ?? undefined}
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          title={policy.saved ? m.uncertified : m.notSaved}
          action={
            canCertify && policy.saved ? (
              <Button size="small" type="primary" onClick={certify}>
                {m.certify}
              </Button>
            ) : undefined
          }
        />
      )}
      <Card size="small" title={m.windows}>
        <Space orientation="vertical">
          {days.map((row, index) => (
            <Space key={index} wrap>
              <Checkbox
                checked={row.on}
                disabled={!canManage}
                onChange={(event) =>
                  setDays((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, on: event.target.checked } : r)),
                  )
                }
              >
                <span className="inline-block w-20">{m.dayNames[index]}</span>
              </Checkbox>
              <TimePicker.RangePicker
                format="HH:mm"
                minuteStep={15}
                disabled={!canManage || !row.on}
                value={[row.from, row.to]}
                onChange={(value) => {
                  if (!value?.[0] || !value[1]) return;
                  const [from, to] = value;
                  setDays((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, from, to } : r)),
                  );
                }}
              />
            </Space>
          ))}
        </Space>
      </Card>
      <Form form={form} layout="vertical" disabled={!canManage}>
        <Space wrap>
          <Form.Item name="max_attempts" label={m.maxAttempts} rules={[{ required: true }]}>
            <InputNumber min={1} max={10} />
          </Form.Item>
          <Form.Item name="min_gap_days" label={m.minGapDays} rules={[{ required: true }]}>
            <InputNumber min={1} max={60} />
          </Form.Item>
        </Space>
        <Form.Item
          name="opening_script"
          label={m.opening}
          extra={m.openingHint}
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={3} maxLength={1000} />
        </Form.Item>
        <Form.Item name="optout_script" label={m.optOut} rules={[{ required: true }]}>
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
      <Text type="secondary" className="block text-xs">
        {m.preview}: {policy.opening_preview}
      </Text>
      {canManage && (
        <Button type="primary" loading={busy} onClick={() => void save()}>
          {m.savePolicy}
        </Button>
      )}
    </div>
  );
}

// --- lists ----------------------------------------------------------------------

function ListForm({
  list,
  open,
  onClose,
  onSaved,
}: {
  list: CallList | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      list
        ? { name: list.name, script: list.script, kb_article_ids: list.kb_article_ids }
        : { kb_article_ids: [] },
    );
  }, [open, list, form]);

  async function search(q: string) {
    const result = await appApi<{ items: Article[] }>(
      `kb/articles?q=${encodeURIComponent(q)}&limit=20`,
    );
    if (result.ok) {
      setOptions(
        result.data.items.map((a) => ({ value: a.id, label: `${a.articleNo} ${a.title}` })),
      );
    }
  }

  async function save() {
    const values = await form.validateFields();
    setBusy(true);
    const result = await appApi(list ? `smart/call-lists/${list.id}` : "smart/call-lists", {
      method: list ? "PUT" : "POST",
      body: JSON.stringify(values),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      title={list ? m.editList : m.newList}
      onCancel={onClose}
      onOk={() => void save()}
      confirmLoading={busy}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label={m.listName} rules={[{ required: true }]}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="script" label={m.script} extra={m.scriptHint} rules={[{ required: true }]}>
          <Input.TextArea rows={5} maxLength={4000} />
        </Form.Item>
        <Form.Item name="kb_article_ids" label={m.articles} extra={m.articlesHint}>
          <Select
            mode="multiple"
            showSearch
            filterOption={false}
            onSearch={(q) => void search(q)}
            onFocus={() => void search("")}
            options={options}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ListDetail({
  list,
  canManage,
  onChanged,
}: {
  list: CallList;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { message, modal } = App.useApp();
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [script, setScript] = useState<{ opening: string; script: string; articles: { id: string; article_no: string; title: string; published: boolean }[] } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    void Promise.all([
      appApi<Target[]>(`smart/call-lists/${list.id}/targets`),
      appApi<{ opening: string; script: string; articles: { id: string; article_no: string; title: string; published: boolean }[] }>(
        `smart/call-lists/${list.id}/script`,
      ),
    ]).then(([t, s]) => {
      if (!live) return;
      if (t.ok) setTargets(t.data);
      if (s.ok) setScript(s.data);
    });
    return () => {
      live = false;
    };
  }, [list.id, tick]);

  function refuse(target: Target) {
    modal.confirm({
      title: m.refuseTitle(target.name),
      content: m.refuseHint,
      onOk: async () => {
        const result = await appApi(`smart/call-targets/${target.id}/refuse`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!result.ok) message.error(result.message);
        else {
          setTick((n) => n + 1);
          onChanged();
        }
      },
    });
  }

  return (
    <div className="space-y-3">
      {script && (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={m.opening}>{script.opening}</Descriptions.Item>
          <Descriptions.Item label={m.script}>
            <span className="whitespace-pre-wrap">{script.script}</span>
          </Descriptions.Item>
          <Descriptions.Item label={m.articles}>
            {script.articles.length
              ? script.articles.map((a) => (
                  <div key={a.id}>
                    {a.article_no} {a.title}{" "}
                    {!a.published && <Tag color="red">{m.unpublished}</Tag>}
                  </div>
                ))
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Table<Target>
        rowKey="id"
        size="small"
        loading={targets === null}
        dataSource={targets ?? []}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        scroll={{ x: true }}
        columns={[
          { title: m.target, dataIndex: "name" },
          { title: m.phone, dataIndex: "phone" },
          {
            title: m.targetStatus,
            dataIndex: "status",
            render: (value: string) => m.targetStatuses[value] ?? value,
          },
          { title: m.attempts, dataIndex: "attempts", align: "right" },
          { title: m.lastAttempt, dataIndex: "last_attempt_at", render: when },
          {
            title: m.now,
            key: "hold",
            render: (_: unknown, row) =>
              row.hold ? (
                <Tag color={row.hold === "do_not_contact" ? "red" : "default"}>{row.hold_label}</Tag>
              ) : (
                <Tag color="green">{m.callable}</Tag>
              ),
          },
          ...(canManage
            ? [
                {
                  key: "refuse",
                  render: (_: unknown, row: Target) =>
                    row.status === "pending" ? (
                      <Button size="small" danger type="link" onClick={() => refuse(row)}>
                        {m.refuse}
                      </Button>
                    ) : null,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

export function CallLists({
  canManage,
  version,
}: {
  canManage: boolean;
  version: number;
}) {
  const { message } = App.useApp();
  const [lists, setLists] = useState<CallList[] | null>(null);
  const [editing, setEditing] = useState<CallList | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [open, setOpen] = useState<CallList | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<CallList[]>("smart/call-lists").then((result) => {
      if (live && result.ok) setLists(result.data);
    });
    return () => {
      live = false;
    };
  }, [version, tick]);

  async function setStatus(list: CallList, status: string) {
    const result = await appApi(`smart/call-lists/${list.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    if (!result.ok) message.error(result.message);
    else setTick((n) => n + 1);
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {m.newList}
        </Button>
      )}
      <Table<CallList>
        rowKey="id"
        size="small"
        loading={lists === null}
        dataSource={lists ?? []}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: m.noLists }}
        onRow={(row) => ({ onClick: () => setOpen(row) })}
        rowClassName="cursor-pointer"
        columns={[
          { title: m.listName, dataIndex: "name" },
          {
            title: m.listStatus,
            dataIndex: "status",
            render: (value: string) => (
              <Tag color={listColor[value]}>{m.listStatuses[value] ?? value}</Tag>
            ),
          },
          {
            title: m.targetCounts,
            key: "counts",
            render: (_: unknown, row) =>
              Object.entries(row.targets)
                .map(([status, count]) => `${m.targetStatuses[status] ?? status} ${count}`)
                .join(" · ") || "—",
          },
          { title: m.createdAt, dataIndex: "created_at", render: when },
          ...(canManage
            ? [
                {
                  key: "actions",
                  render: (_: unknown, row: CallList) => (
                    <Space onClick={(event) => event.stopPropagation()}>
                      {row.status !== "active" && row.status !== "closed" && (
                        <Button size="small" onClick={() => void setStatus(row, "active")}>
                          {m.activate}
                        </Button>
                      )}
                      {row.status === "active" && (
                        <Button size="small" onClick={() => void setStatus(row, "paused")}>
                          {m.pause}
                        </Button>
                      )}
                      {row.status !== "closed" && (
                        <>
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              setEditing(row);
                              setFormOpen(true);
                            }}
                          >
                            {m.editList}
                          </Button>
                          <Button size="small" type="link" danger onClick={() => void setStatus(row, "closed")}>
                            {m.close}
                          </Button>
                        </>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      <ListForm
        list={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setTick((n) => n + 1)}
      />
      <Drawer
        open={open !== null}
        size={900}
        title={open?.name}
        onClose={() => setOpen(null)}
        destroyOnHidden
      >
        {open && (
          <ListDetail
            list={open}
            canManage={canManage}
            onChanged={() => setTick((n) => n + 1)}
          />
        )}
      </Drawer>
    </div>
  );
}

/** Adds the selected screened rows to a call list. */
export function AddToCallList({
  prospectIds,
  onDone,
}: {
  prospectIds: string[];
  onDone: () => void;
}) {
  const { message, modal } = App.useApp();
  const [lists, setLists] = useState<CallList[]>([]);
  const [listId, setListId] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    void appApi<CallList[]>("smart/call-lists").then((result) => {
      if (result.ok) setLists(result.data.filter((list) => list.status !== "closed"));
    });
  }, [open]);

  async function add() {
    if (!listId) return;
    const result = await appApi<{
      added: number;
      already: number;
      blocked: number;
      skipped: { id: string; name: string; reason: string }[];
    }>(`smart/call-lists/${listId}/targets`, {
      method: "POST",
      body: JSON.stringify({ prospect_ids: prospectIds }),
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setOpen(false);
    modal.info({
      title: m.addedTitle(result.data.added, result.data.blocked, result.data.already),
      content: result.data.skipped.length ? (
        <ul className="m-0 pl-4 text-xs">
          {result.data.skipped.map((row) => (
            <li key={row.id}>
              {row.name} — {row.reason}
            </li>
          ))}
        </ul>
      ) : undefined,
    });
    onDone();
  }

  return (
    <>
      <Button disabled={!prospectIds.length} onClick={() => setOpen(true)}>
        {m.addToList(prospectIds.length)}
      </Button>
      <Modal
        open={open}
        title={m.addToList(prospectIds.length)}
        onCancel={() => setOpen(false)}
        onOk={() => void add()}
        okButtonProps={{ disabled: !listId }}
        destroyOnHidden
      >
        <Select
          className="w-full"
          placeholder={m.pickList}
          value={listId}
          onChange={setListId}
          options={lists.map((list) => ({ value: list.id, label: list.name }))}
        />
      </Modal>
    </>
  );
}

// --- do-not-contact register ----------------------------------------------------

interface OptOut {
  id: string;
  kind: string;
  value: string;
  channel: string;
  reason: string | null;
  source: string;
  created_at: string;
  removed_at: string | null;
  remove_reason: string | null;
}

export function OptOuts() {
  const { message, modal } = App.useApp();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ data: OptOut[]; total: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ page: String(page), page_size: "50" });
    if (search) params.set("q", search);
    if (showRemoved) params.set("active", "false");
    void appApi<{ data: OptOut[]; total: number }>(`contact-optouts?${params.toString()}`).then(
      (result) => {
        if (live && result.ok) setData(result.data);
      },
    );
    return () => {
      live = false;
    };
  }, [search, showRemoved, page, tick]);

  async function add() {
    const values = await form.validateFields();
    const result = await appApi("contact-optouts", {
      method: "POST",
      body: JSON.stringify(values),
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setAdding(false);
    form.resetFields();
    setTick((n) => n + 1);
  }

  function remove(row: OptOut) {
    let reason = "";
    modal.confirm({
      title: m.optOuts.removeTitle(row.value),
      content: (
        <Input.TextArea
          rows={3}
          placeholder={m.optOuts.removeReason}
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      onOk: async () => {
        if (!reason.trim()) return Promise.reject();
        const result = await appApi(`contact-optouts/${row.id}/remove`, {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() }),
        });
        if (!result.ok) message.error(result.message);
        else setTick((n) => n + 1);
      },
    });
  }

  return (
    <div className="space-y-3">
      <Text type="secondary" className="block text-xs">
        {m.optOuts.hint}
      </Text>
      <div className="flex flex-wrap gap-2">
        <Input.Search
          allowClear
          className="w-64"
          placeholder={m.optOuts.search}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
        />
        <Checkbox checked={showRemoved} onChange={(event) => setShowRemoved(event.target.checked)}>
          {m.optOuts.showRemoved}
        </Checkbox>
        <Button icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          {m.optOuts.add}
        </Button>
      </div>
      <Table<OptOut>
        rowKey="id"
        size="small"
        loading={data === null}
        dataSource={data?.data ?? []}
        scroll={{ x: true }}
        pagination={{
          current: page,
          pageSize: 50,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        columns={[
          { title: m.optOuts.value, dataIndex: "value" },
          {
            title: m.optOuts.channel,
            dataIndex: "channel",
            render: (value: string) => m.optOuts.channels[value] ?? value,
          },
          {
            title: m.optOuts.source,
            dataIndex: "source",
            render: (value: string) => m.optOuts.sources[value] ?? value,
          },
          { title: m.optOuts.reason, dataIndex: "reason", render: (v: string | null) => v ?? "—" },
          { title: m.createdAt, dataIndex: "created_at", render: when },
          {
            key: "state",
            render: (_: unknown, row) =>
              row.removed_at ? (
                <Tag title={row.remove_reason ?? ""}>{m.optOuts.removed}</Tag>
              ) : (
                <Button size="small" type="link" danger onClick={() => remove(row)}>
                  {m.optOuts.remove}
                </Button>
              ),
          },
        ]}
      />
      <Modal
        open={adding}
        title={m.optOuts.add}
        onCancel={() => setAdding(false)}
        onOk={() => void add()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ kind: "phone", channel: "all" }}>
          <Form.Item name="kind" label={m.optOuts.kind}>
            <Select
              options={[
                { value: "phone", label: m.optOuts.kinds.phone },
                { value: "email", label: m.optOuts.kinds.email },
              ]}
            />
          </Form.Item>
          <Form.Item name="value" label={m.optOuts.value} rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="channel" label={m.optOuts.channel}>
            <Select
              options={(["call", "all"] as const).map((value) => ({
                value,
                label: m.optOuts.channels[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label={m.optOuts.reason}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
