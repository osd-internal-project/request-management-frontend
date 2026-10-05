"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  ProblemJob,
  ProblemSuggestions,
  ServiceProblem,
} from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.problems;
type Person = { id: string; name: string };

const STATUS_COLOR: Record<string, string> = {
  investigating: "blue",
  known_error: "orange",
  resolved: "green",
};
const NEXT: Record<string, string[]> = {
  open: ["investigating", "known_error", "resolved"],
  investigating: ["known_error", "resolved"],
  known_error: ["investigating", "resolved"],
  resolved: ["investigating", "closed"],
  closed: [],
};

function scopeLabel(row: {
  scope: string;
  asset: string | null;
  productCode: string | null;
  customer: string | null;
}) {
  return [
    m.scopes[row.scope],
    row.asset,
    row.scope !== "asset" ? row.productCode : null,
    row.scope === "customer_model" ? row.customer : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function JobsTable({
  jobs,
  onUnlink,
}: {
  readonly jobs: ProblemJob[];
  readonly onUnlink?: (workOrderId: string) => void;
}) {
  return (
    <Table<ProblemJob>
      size="small"
      rowKey="workOrderId"
      pagination={false}
      dataSource={jobs}
      scroll={{ x: 600 }}
      columns={[
        {
          title: m.columns.no,
          width: 150,
          render: (_: unknown, row) => (
            <Link href={ROUTES.requestDetail(row.requestId)}>
              {row.requestNo ?? row.requestId.slice(0, 8)}
            </Link>
          ),
        },
        {
          title: m.columns.title,
          render: (_: unknown, row) => (
            <span>
              {row.subject}
              {(row.cause || row.resolution) && (
                <Text type="secondary" className="block text-xs">
                  {[row.cause, row.resolution].filter(Boolean).join(" → ")}
                </Text>
              )}
            </span>
          ),
        },
        {
          title: "",
          width: 110,
          render: (_: unknown, row) => row.createdAt.slice(0, 10),
        },
        ...(onUnlink
          ? [
              {
                title: "",
                width: 80,
                render: (_: unknown, row: ProblemJob) => (
                  <Button
                    size="small"
                    onClick={() => onUnlink(row.workOrderId)}
                  >
                    {m.unlink}
                  </Button>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}

/** CD-246 — suggested groups and the problem register. */
export function Problems({
  canManage,
  people,
}: {
  readonly canManage: boolean;
  readonly people: readonly Person[];
}) {
  const { message } = App.useApp();
  const [tab, setTab] = useState("suggestions");
  const [state, setState] = useState("open");
  const [reload, setReload] = useState(0);
  const [suggestions, setSuggestions] = useState<ProblemSuggestions | null>(
    null,
  );
  const [rows, setRows] = useState<ServiceProblem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [making, setMaking] = useState<{
    group: ProblemSuggestions["groups"][number];
    title: string;
    owner: string | null;
  } | null>(null);
  const [detail, setDetail] = useState<ServiceProblem | null>(null);
  const [editing, setEditing] = useState<{
    status: string;
    workaround: string;
    rootCause: string;
    permanentFix: string;
    techChangeRef: string;
    owner: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([
      appApi<ProblemSuggestions>("service-problems/suggestions"),
      appApi<ServiceProblem[]>(`service-problems?state=${state}`),
    ]).then(([s, p]) => {
      if (!live) return;
      if (s.ok) setSuggestions(s.data);
      else setError(s.message);
      if (p.ok) setRows(p.data);
      else setError(p.message);
    });
    return () => {
      live = false;
    };
  }, [state, reload]);

  async function send<T>(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const result = await appApi<T>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    message.success(m.saved);
    setReload((n) => n + 1);
    return result.data;
  }

  async function openDetail(id: string) {
    const result = await appApi<ServiceProblem>(`service-problems/${id}`);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setDetail(result.data);
    setEditing({
      status: result.data.status,
      workaround: result.data.workaround ?? "",
      rootCause: result.data.rootCause ?? "",
      permanentFix: result.data.permanentFix ?? "",
      techChangeRef: result.data.techChangeRef ?? "",
      owner: result.data.ownerUserId,
    });
  }

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "suggestions",
            label: `${m.tabs.suggestions} (${suggestions?.groups.length ?? 0})`,
            children: (
              <div className="space-y-3">
                {suggestions && (
                  <Text type="secondary" className="block text-xs">
                    {m.suggestionsHint(suggestions.days)}
                  </Text>
                )}
                {suggestions?.groups.length === 0 && (
                  <Text type="secondary">{m.noSuggestions}</Text>
                )}
                {suggestions?.groups.map((group) => (
                  <Card
                    key={group.key}
                    size="small"
                    title={
                      <Space wrap>
                        <Tag>{m.scopes[group.scope]}</Tag>
                        {scopeLabel(group)}
                        <Text type="secondary">
                          {m.jobs(group.jobIds.length)}
                        </Text>
                      </Space>
                    }
                    extra={
                      canManage && (
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() =>
                              setMaking({
                                group,
                                title: group.jobs[0]?.subject ?? "",
                                owner: null,
                              })
                            }
                          >
                            {m.make}
                          </Button>
                          <Popconfirm
                            title={m.dismissHint}
                            onConfirm={() =>
                              void send(
                                "service-problems/suggestions/dismiss",
                                "POST",
                                {
                                  group_key: group.key,
                                  size: group.jobIds.length,
                                },
                              )
                            }
                          >
                            <Button size="small">{m.dismiss}</Button>
                          </Popconfirm>
                        </Space>
                      )
                    }
                  >
                    <JobsTable jobs={group.jobs} />
                  </Card>
                ))}
              </div>
            ),
          },
          {
            key: "problems",
            label: m.tabs.problems,
            children: (
              <>
                <Select
                  className="mb-3"
                  style={{ width: 160 }}
                  value={state}
                  onChange={setState}
                  options={Object.entries(m.states).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
                <Table<ServiceProblem>
                  rowKey="id"
                  size="small"
                  loading={rows === null}
                  dataSource={rows ?? []}
                  pagination={
                    (rows?.length ?? 0) > 30 ? { pageSize: 30 } : false
                  }
                  locale={{ emptyText: m.empty }}
                  scroll={{ x: 900 }}
                  onRow={(row) => ({
                    onClick: () => void openDetail(row.id),
                    style: { cursor: "pointer" },
                  })}
                  columns={[
                    { title: m.columns.no, dataIndex: "problemNo", width: 120 },
                    { title: m.columns.title, dataIndex: "title" },
                    {
                      title: m.columns.scope,
                      width: 260,
                      render: (_: unknown, row) => scopeLabel(row),
                    },
                    { title: m.columns.jobs, dataIndex: "jobCount", width: 70 },
                    {
                      title: m.columns.owner,
                      dataIndex: "ownerName",
                      width: 160,
                    },
                    {
                      title: m.columns.status,
                      width: 190,
                      render: (_: unknown, row) => (
                        <Tag color={STATUS_COLOR[row.status]}>
                          {m.status[row.status]}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        open={making !== null}
        title={m.make}
        onCancel={() => setMaking(null)}
        okText={m.form.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !making?.title.trim() || !making?.owner }}
        onOk={() => {
          if (!making) return;
          void send("service-problems", "POST", {
            title: making.title,
            scope: making.group.scope,
            ...(making.group.assetId ? { asset_id: making.group.assetId } : {}),
            ...(making.group.productCode
              ? { product_code: making.group.productCode }
              : {}),
            ...(making.group.customerId
              ? { customer_id: making.group.customerId }
              : {}),
            owner_user_id: making.owner,
            work_order_ids: making.group.jobIds,
          }).then((data) => {
            if (data) {
              setMaking(null);
              setTab("problems");
            }
          });
        }}
        destroyOnHidden
      >
        {making && (
          <div className="space-y-3">
            <Text type="secondary" className="block text-xs">
              {scopeLabel(making.group)} · {m.jobs(making.group.jobIds.length)}
            </Text>
            <label className="block text-xs">
              {m.form.title}
              <Input
                maxLength={255}
                value={making.title}
                onChange={(event) =>
                  setMaking({ ...making, title: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.owner}
              <Select
                className="w-full"
                showSearch={{ optionFilterProp: "label" }}
                value={making.owner ?? undefined}
                options={people.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(value: string) =>
                  setMaking({ ...making, owner: value })
                }
              />
            </label>
          </div>
        )}
      </Modal>

      <Drawer
        open={detail !== null}
        size={640}
        title={detail ? `${detail.problemNo} · ${detail.title}` : ""}
        onClose={() => setDetail(null)}
      >
        {detail && editing && (
          <div className="space-y-3">
            <Text type="secondary" className="block text-xs">
              {scopeLabel(detail)}
            </Text>
            {canManage ? (
              <>
                <label className="block text-xs">
                  {m.form.status}
                  <Select
                    className="w-full"
                    value={editing.status}
                    options={[
                      detail.status,
                      ...(NEXT[detail.status] ?? []),
                    ].map((value) => ({ value, label: m.status[value] }))}
                    onChange={(value: string) =>
                      setEditing({ ...editing, status: value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {m.form.owner}
                  <Select
                    className="w-full"
                    showSearch={{ optionFilterProp: "label" }}
                    value={editing.owner}
                    options={
                      people.length
                        ? people.map((p) => ({ value: p.id, label: p.name }))
                        : [
                            {
                              value: detail.ownerUserId,
                              label: detail.ownerName,
                            },
                          ]
                    }
                    onChange={(value: string) =>
                      setEditing({ ...editing, owner: value })
                    }
                  />
                </label>
                {(
                  [
                    ["workaround", m.form.workaround],
                    ["rootCause", m.form.rootCause],
                    ["permanentFix", m.form.permanentFix],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block text-xs">
                    {label}
                    <Input.TextArea
                      rows={2}
                      maxLength={4000}
                      value={editing[field]}
                      onChange={(event) =>
                        setEditing({ ...editing, [field]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <label className="block text-xs">
                  {m.form.techChangeRef}
                  <Input
                    maxLength={100}
                    value={editing.techChangeRef}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        techChangeRef: event.target.value,
                      })
                    }
                  />
                </label>
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() =>
                    void send<ServiceProblem>(
                      `service-problems/${detail.id}`,
                      "PUT",
                      {
                        ...(editing.status !== detail.status
                          ? { status: editing.status }
                          : {}),
                        owner_user_id: editing.owner,
                        workaround: editing.workaround,
                        root_cause: editing.rootCause,
                        permanent_fix: editing.permanentFix,
                        tech_change_ref: editing.techChangeRef,
                      },
                    ).then((data) => data && void openDetail(detail.id))
                  }
                >
                  {m.form.save}
                </Button>
              </>
            ) : (
              <div className="space-y-1 text-sm">
                <Tag color={STATUS_COLOR[detail.status]}>
                  {m.status[detail.status]}
                </Tag>
                {detail.workaround && (
                  <p>
                    <b>{m.form.workaround}:</b> {detail.workaround}
                  </p>
                )}
                {detail.rootCause && (
                  <p>
                    <b>{m.form.rootCause}:</b> {detail.rootCause}
                  </p>
                )}
                {detail.permanentFix && (
                  <p>
                    <b>{m.form.permanentFix}:</b> {detail.permanentFix}
                  </p>
                )}
              </div>
            )}
            <JobsTable
              jobs={detail.jobs ?? []}
              onUnlink={
                canManage
                  ? (workOrderId) =>
                      void send<ServiceProblem>(
                        `service-problems/${detail.id}/jobs/${workOrderId}`,
                        "DELETE",
                      ).then((data) => data && setDetail(data))
                  : undefined
              }
            />
          </div>
        )}
      </Drawer>
    </Card>
  );
}

/**
 * CD-246 — on a job's panel: the problem it is under, or the open problems
 * it matches with their workaround (link it in one click).
 */
export function ProblemBanner({
  workOrderId,
  canManage,
}: {
  readonly workOrderId: string;
  readonly canManage: boolean;
}) {
  const { message } = App.useApp();
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{
    linked: ServiceProblem | null;
    matches: ServiceProblem[];
  } | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<{ linked: ServiceProblem | null; matches: ServiceProblem[] }>(
      `service-problems/by-work-order/${workOrderId}`,
    ).then((result) => {
      if (live && result.ok) setData(result.data);
    });
    return () => {
      live = false;
    };
  }, [workOrderId, reload]);

  async function link(problemId: string) {
    const result = await appApi<ServiceProblem>(
      `service-problems/${problemId}/jobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_order_ids: [workOrderId] }),
      },
    );
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.saved);
    setReload((n) => n + 1);
  }

  if (!data) return null;
  if (data.linked) {
    return (
      <Alert
        className="mb-2"
        type="info"
        showIcon
        title={m.banner.linked(
          data.linked.problemNo,
          m.status[data.linked.status],
        )}
        description={
          data.linked.workaround
            ? `${m.banner.workaround}: ${data.linked.workaround}`
            : data.linked.title
        }
      />
    );
  }
  return (
    <>
      {data.matches.map((problem) => (
        <Alert
          key={problem.id}
          className="mb-2"
          type="warning"
          showIcon
          title={m.banner.match(problem.problemNo, problem.title)}
          description={
            problem.workaround
              ? `${m.banner.workaround}: ${problem.workaround}`
              : undefined
          }
          action={
            canManage && (
              <Button size="small" onClick={() => void link(problem.id)}>
                {m.banner.link}
              </Button>
            )
          }
        />
      ))}
    </>
  );
}
