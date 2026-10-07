"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { searchUsers } from "@/lib/api/client-roles";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { fill, shortDate, STATUS_COLOR } from "./kb-types";

const m = messages.kb.gaps;

interface Gap {
  id: string;
  kind: "ai_unanswered" | "low_rated" | "search_miss";
  title: string;
  detail: string | null;
  occurrences: number;
  status: "open" | "assigned" | "resolved" | "dismissed";
  firstSeenAt: string;
  lastSeenAt: string;
  article: {
    id: string;
    articleNo: string;
    title: string;
    votes: number;
    helpful: number;
  } | null;
  assignee: string | null;
  assigneeId: string | null;
  dueOn: string | null;
  overdue: boolean;
  resolution: {
    id: string;
    articleNo: string;
    title: string;
    status: string;
  } | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  dismissReason: string | null;
  canWork: boolean;
}

interface ListResponse {
  canManage: boolean;
  thresholds: {
    minVotes: number;
    helpfulPercent: number;
    searchMisses: number;
  };
  items: Gap[];
}

interface Month {
  month: string;
  searches: number;
  answered: number;
  unanswered: number;
  selfAnswerPct: number | null;
  byChannel: { channel: string; selfAnswerPct: number | null }[];
  gapsOpened: number;
  gapsResolved: number;
}

type Dialog =
  | {
      kind: "assign";
      gap: Gap;
      person?: string;
      due: Dayjs | null;
      options: { value: string; label: string }[];
    }
  | {
      kind: "link";
      gap: Gap;
      article?: string;
      options: { value: string; label: string }[];
    }
  | { kind: "dismiss"; gap: Gap; reason: string };

const KIND_COLOR: Record<string, string> = {
  ai_unanswered: "purple",
  low_rated: "orange",
  search_miss: "blue",
};

const STATUS_TAG: Record<string, string> = {
  open: "warning",
  assigned: "processing",
  resolved: "success",
  dismissed: "default",
};

const pct = (n: number | null) => (n === null ? m.noData : `${n}%`);

/** CD-266 — knowledge gaps: list, hand out, fill, and the monthly numbers. */
export function KbGaps({
  canManage,
  focusId,
}: {
  canManage: boolean;
  focusId?: string;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [tab, setTab] = useState("live");
  const [kind, setKind] = useState("all");
  const [mine, setMine] = useState(false);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<(ListResponse & { key: string }) | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<Month[] | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(false);

  const params = new URLSearchParams();
  if (tab !== "live") params.set("status", tab);
  if (kind !== "all") params.set("kind", kind);
  if (mine) params.set("mine", "true");
  const key = `${params.toString()}#${version}`;

  useEffect(() => {
    let live = true;
    const query = key.split("#")[0];
    void appApi<ListResponse>(`kb/gaps${query ? `?${query}` : ""}`).then(
      (res) => {
        if (!live) return;
        if (res.ok) {
          setError(null);
          setData({ key, ...res.data });
        } else setError(res.message);
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    if (!canManage) return;
    let live = true;
    void appApi<Month[]>("kb/gaps/monthly").then((res) => {
      if (live && res.ok) setMonths(res.data);
    });
    return () => {
      live = false;
    };
  }, [canManage, version]);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    const res = await appApi<{ articleId?: string }>(path, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return null;
    }
    return res.data;
  }

  async function write(gap: Gap) {
    const res = await post(`kb/gaps/${gap.id}/article`);
    if (res?.articleId) router.push(ROUTES.kbEdit(res.articleId));
  }

  async function save() {
    if (!dialog) return;
    let ok = null;
    if (dialog.kind === "assign") {
      if (!dialog.person || !dialog.due) return;
      ok = await post(`kb/gaps/${dialog.gap.id}/assign`, {
        assignee_id: dialog.person,
        due_on: dialog.due.format("YYYY-MM-DD"),
      });
    } else if (dialog.kind === "link") {
      if (!dialog.article) return;
      ok = await post(`kb/gaps/${dialog.gap.id}/link`, {
        article_id: dialog.article,
      });
    } else {
      if (!dialog.reason.trim()) {
        void message.warning(m.reasonRequired);
        return;
      }
      ok = await post(`kb/gaps/${dialog.gap.id}/dismiss`, {
        reason: dialog.reason.trim(),
      });
    }
    if (!ok) return;
    void message.success(m.saved);
    setDialog(null);
    setVersion((v) => v + 1);
  }

  async function findPeople(term: string) {
    if (dialog?.kind !== "assign") return;
    setLookup(true);
    const res = await searchUsers(term);
    setLookup(false);
    setDialog({
      ...dialog,
      options: res.ok
        ? res.data.data.map((p) => ({
            value: p.id,
            label: `${p.displayName} · ${p.username}`,
          }))
        : [],
    });
  }

  async function findArticles(term: string) {
    if (dialog?.kind !== "link") return;
    setLookup(true);
    const res = await appApi<{
      items: { id: string; articleNo: string; title: string }[];
    }>(
      `kb/articles?limit=20${term.trim() ? `&q=${encodeURIComponent(term.trim())}` : ""}`,
    );
    setLookup(false);
    setDialog({
      ...dialog,
      options: res.ok
        ? res.data.items.map((a) => ({
            value: a.id,
            label: `${a.articleNo} · ${a.title}`,
          }))
        : [],
    });
  }

  const t = data?.thresholds;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Text type="secondary">
        {canManage && t
          ? fill(m.hint, {
              votes: t.minVotes,
              pct: t.helpfulPercent,
              misses: t.searchMisses,
            })
          : m.hintMine}
      </Text>

      {canManage && months ? <MonthlyTable rows={months} /> : null}

      <Space wrap>
        <Segmented
          value={tab}
          onChange={(v) => setTab(String(v))}
          options={Object.entries(m.tabs).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          className="min-w-36"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: m.allKinds },
            ...Object.entries(m.kinds).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        {canManage ? (
          <Checkbox checked={mine} onChange={(e) => setMine(e.target.checked)}>
            {m.mine}
          </Checkbox>
        ) : null}
      </Space>

      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : !data || data.key !== key ? (
        <Skeleton active />
      ) : !data.items.length ? (
        <Empty description={m.none} />
      ) : (
        <Table<Gap>
          rowKey="id"
          size="small"
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          dataSource={data.items}
          rowClassName={(g) => (g.id === focusId ? "bg-blue-50" : "")}
          scroll={{ x: 900 }}
          columns={[
            {
              title: m.gap,
              key: "gap",
              render: (_, g) => (
                <Space orientation="vertical" size={2}>
                  <Space size={4} wrap>
                    <Tag color={KIND_COLOR[g.kind]}>{m.kinds[g.kind]}</Tag>
                    <Text strong>{g.title}</Text>
                  </Space>
                  {g.detail && g.detail !== g.title ? (
                    <Text type="secondary" className="text-xs">
                      {g.detail}
                    </Text>
                  ) : null}
                  {g.article ? (
                    <Link href={ROUTES.kbArticle(g.article.id)}>
                      {g.article.articleNo} · {g.article.title}
                    </Link>
                  ) : null}
                </Space>
              ),
            },
            {
              title: m.times.replace("{n} ", ""),
              key: "count",
              width: 110,
              render: (_, g) =>
                g.kind === "low_rated" && g.article ? (
                  <Text>
                    {fill(m.votes, {
                      yes: g.article.helpful,
                      n: g.article.votes,
                    })}
                  </Text>
                ) : (
                  <Text>{fill(m.times, { n: g.occurrences })}</Text>
                ),
            },
            {
              title: m.seen,
              key: "seen",
              width: 100,
              render: (_, g) => shortDate(g.lastSeenAt),
            },
            {
              title: m.assignee,
              key: "assignee",
              width: 190,
              render: (_, g) => (
                <Space orientation="vertical" size={2}>
                  <Tag color={STATUS_TAG[g.status]}>{m.statuses[g.status]}</Tag>
                  {g.assignee ? <Text>{g.assignee}</Text> : null}
                  {g.dueOn ? (
                    <Text
                      type={g.overdue ? "danger" : "secondary"}
                      className="text-xs"
                    >
                      {m.due} {shortDate(g.dueOn)}
                      {g.overdue ? ` · ${m.overdue}` : ""}
                    </Text>
                  ) : null}
                  {g.dismissReason ? (
                    <Text type="secondary" className="text-xs">
                      {g.dismissReason}
                    </Text>
                  ) : null}
                </Space>
              ),
            },
            {
              title: m.article,
              key: "resolution",
              width: 200,
              render: (_, g) =>
                g.resolution ? (
                  <Space orientation="vertical" size={2}>
                    <Link href={ROUTES.kbArticle(g.resolution.id)}>
                      {g.resolution.articleNo} · {g.resolution.title}
                    </Link>
                    {g.resolution.status !== "published" &&
                    g.status !== "resolved" ? (
                      <Tag color={STATUS_COLOR[g.resolution.status]}>
                        {m.waitingPublish}
                      </Tag>
                    ) : null}
                  </Space>
                ) : null,
            },
            {
              title: "",
              key: "actions",
              width: 220,
              render: (_, g) =>
                g.status === "open" || g.status === "assigned" ? (
                  <Space wrap size={4}>
                    {g.canWork ? (
                      g.kind === "low_rated" && g.article ? (
                        <Link
                          href={ROUTES.kbArticle(g.article.id)}
                          title={m.reviseHint}
                        >
                          <Button size="small" type="primary">
                            {m.revise}
                          </Button>
                        </Link>
                      ) : g.resolution ? (
                        g.resolution.status === "draft" ? (
                          <Link href={ROUTES.kbEdit(g.resolution.id)}>
                            <Button size="small" type="primary">
                              {m.continueDraft}
                            </Button>
                          </Link>
                        ) : null
                      ) : (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            loading={busy}
                            onClick={() => void write(g)}
                          >
                            {m.write}
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              setDialog({ kind: "link", gap: g, options: [] })
                            }
                          >
                            {m.link}
                          </Button>
                        </>
                      )
                    ) : null}
                    {canManage ? (
                      <>
                        <Button
                          size="small"
                          onClick={() =>
                            setDialog({
                              kind: "assign",
                              gap: g,
                              person: g.assigneeId ?? undefined,
                              due: g.dueOn
                                ? dayjs(g.dueOn)
                                : dayjs().add(7, "day"),
                              options:
                                g.assigneeId && g.assignee
                                  ? [{ value: g.assigneeId, label: g.assignee }]
                                  : [],
                            })
                          }
                        >
                          {g.assigneeId ? m.reassign : m.assign}
                        </Button>
                        <Button
                          size="small"
                          danger
                          type="text"
                          onClick={() =>
                            setDialog({ kind: "dismiss", gap: g, reason: "" })
                          }
                        >
                          {m.dismiss}
                        </Button>
                      </>
                    ) : null}
                  </Space>
                ) : null,
            },
          ]}
        />
      )}

      <Modal
        open={!!dialog}
        title={
          dialog?.kind === "assign"
            ? m.assignTitle
            : dialog?.kind === "link"
              ? m.linkTitle
              : m.dismissTitle
        }
        onCancel={() => setDialog(null)}
        onOk={() => void save()}
        confirmLoading={busy}
        destroyOnHidden
      >
        {dialog ? (
          <Space orientation="vertical" className="w-full">
            <Text strong>{dialog.gap.title}</Text>
            {dialog.kind === "assign" ? (
              <>
                <Select
                  showSearch
                  filterOption={false}
                  onSearch={(term) => void findPeople(term)}
                  onFocus={() => void findPeople("")}
                  className="w-full"
                  placeholder={m.pickPerson}
                  notFoundContent={lookup ? <Spin size="small" /> : null}
                  value={dialog.person}
                  options={dialog.options}
                  onChange={(person) => setDialog({ ...dialog, person })}
                />
                <Space>
                  <Text>{m.pickDue}</Text>
                  <DatePicker
                    value={dialog.due}
                    onChange={(due) => setDialog({ ...dialog, due })}
                    disabledDate={(d) => d.isBefore(dayjs(), "day")}
                  />
                </Space>
              </>
            ) : dialog.kind === "link" ? (
              <>
                <Text type="secondary">{m.linkHint}</Text>
                <Select
                  showSearch
                  filterOption={false}
                  onSearch={(term) => void findArticles(term)}
                  onFocus={() => void findArticles("")}
                  className="w-full"
                  placeholder={m.pickArticle}
                  notFoundContent={lookup ? <Spin size="small" /> : null}
                  value={dialog.article}
                  options={dialog.options}
                  onChange={(article) => setDialog({ ...dialog, article })}
                />
              </>
            ) : (
              <Input.TextArea
                rows={3}
                maxLength={500}
                placeholder={m.reason}
                value={dialog.reason}
                onChange={(e) =>
                  setDialog({ ...dialog, reason: e.target.value })
                }
              />
            )}
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}

/** Self-answer rate and gaps opened / closed, newest month first. */
function MonthlyTable({ rows }: { rows: Month[] }) {
  const channels = messages.kb.ai.channels;
  return (
    <div>
      <Text strong className="mb-1 block">
        {m.monthly}
      </Text>
      <Table<Month>
        rowKey="month"
        size="small"
        pagination={false}
        scroll={{ x: 640 }}
        dataSource={[...rows].reverse()}
        columns={[
          {
            title: m.month,
            dataIndex: "month",
            render: (v: string) =>
              new Date(`${v}-01T00:00:00`).toLocaleDateString("th-TH", {
                month: "short",
                year: "2-digit",
              }),
          },
          { title: m.searches, dataIndex: "searches", align: "right" },
          {
            title: m.selfAnswer,
            dataIndex: "selfAnswerPct",
            align: "right",
            render: pct,
          },
          ...["ai_care", "ai_smart"].map((channel) => ({
            title: channels[channel],
            key: channel,
            align: "right" as const,
            render: (_: unknown, r: Month) =>
              pct(
                r.byChannel.find((c) => c.channel === channel)?.selfAnswerPct ??
                  null,
              ),
          })),
          { title: m.opened, dataIndex: "gapsOpened", align: "right" },
          { title: m.closed, dataIndex: "gapsResolved", align: "right" },
        ]}
      />
    </div>
  );
}
