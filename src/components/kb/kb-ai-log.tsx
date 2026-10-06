"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { fill } from "./kb-types";

const m = messages.kb.ai;

interface Row {
  id: string;
  channel: string;
  conversationRef: string | null;
  question: string | null;
  answer: string | null;
  outcome: string;
  createdAt: string;
  textPurged: boolean;
  returned: { articleId: string; version: number }[];
  cited: { articleId: string; version: number }[];
}

const OUTCOME_COLOR: Record<string, string> = {
  pending: "default",
  answered: "success",
  unanswered: "warning",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** CD-265 — what AI channels searched, got back and answered with. */
export function KbAiLog({ articleId }: { articleId?: string }) {
  const [outcome, setOutcome] = useState("all");
  const [channel, setChannel] = useState<string | undefined>();
  const [data, setData] = useState<{
    key: string;
    retentionDays: number;
    items: Row[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});

  const params = new URLSearchParams();
  if (outcome !== "all") params.set("outcome", outcome);
  if (channel) params.set("channel", channel);
  if (articleId) params.set("article_id", articleId);
  const key = params.toString();

  useEffect(() => {
    let live = true;
    void appApi<{ retentionDays: number; items: Row[] }>(
      `kb/ai-log${key ? `?${key}` : ""}`,
    ).then((res) => {
      if (!live) return;
      if (res.ok) setData({ key, ...res.data });
      else setError(res.message);
    });
    return () => {
      live = false;
    };
  }, [key]);

  // Article names, fetched once per article that shows up.
  useEffect(() => {
    const ids = [
      ...new Set(
        (data?.items ?? []).flatMap((r) => r.returned.map((x) => x.articleId)),
      ),
    ].filter((id) => !(id in titles));
    if (!ids.length) return;
    void Promise.all(
      ids.map((id) =>
        appApi<{ articleNo: string; title: string }>(`kb/articles/${id}`).then(
          (res) =>
            [
              id,
              res.ok ? `${res.data.articleNo} · ${res.data.title}` : id,
            ] as const,
        ),
      ),
    ).then((pairs) =>
      setTitles((t) => ({ ...t, ...Object.fromEntries(pairs) })),
    );
  }, [data, titles]);

  if (error) return <Alert type="error" showIcon title={error} />;

  return (
    <Space orientation="vertical" className="w-full">
      {data ? (
        <Text type="secondary">{fill(m.hint, { d: data.retentionDays })}</Text>
      ) : null}
      {articleId ? (
        <Space>
          <Tag color="blue">{m.filteredBy}</Tag>
          <Link href={ROUTES.kbAi}>
            <Button size="small" type="link">
              {m.clearFilter}
            </Button>
          </Link>
        </Space>
      ) : null}
      <Space wrap>
        <Segmented
          value={outcome}
          onChange={(v) => setOutcome(String(v))}
          options={[
            { value: "all", label: m.all },
            ...["answered", "unanswered", "pending"].map((o) => ({
              value: o,
              label: m.outcomes[o],
            })),
          ]}
        />
        <Select
          allowClear
          className="min-w-40"
          placeholder={m.channel}
          value={channel}
          onChange={setChannel}
          options={Object.entries(m.channels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Space>
      {!data || data.key !== key ? (
        <Skeleton active />
      ) : (
        <Table<Row>
          rowKey="id"
          size="small"
          dataSource={data.items}
          locale={{ emptyText: m.none }}
          pagination={{ pageSize: 30, hideOnSinglePage: true }}
          scroll={{ x: 1000 }}
          columns={[
            { title: m.at, dataIndex: "createdAt", width: 110, render: when },
            {
              title: m.channel,
              dataIndex: "channel",
              width: 100,
              render: (v: string) => m.channels[v] ?? v,
            },
            {
              title: m.question,
              key: "q",
              render: (_, r) =>
                r.textPurged ? (
                  <Text type="secondary">{m.purged}</Text>
                ) : (
                  <Space orientation="vertical" size={0}>
                    <Text>{r.question}</Text>
                    {r.answer ? (
                      <Text type="secondary" className="text-xs">
                        {m.answer}: {r.answer}
                      </Text>
                    ) : null}
                  </Space>
                ),
            },
            {
              title: m.outcome,
              dataIndex: "outcome",
              width: 130,
              render: (v: string) => (
                <Tag color={OUTCOME_COLOR[v]}>{m.outcomes[v]}</Tag>
              ),
            },
            {
              title: m.returned,
              key: "articles",
              width: 320,
              render: (_, r) => (
                <Space orientation="vertical" size={0}>
                  {r.returned.map((x) => {
                    const cited = r.cited.some(
                      (c) => c.articleId === x.articleId,
                    );
                    return (
                      <span key={x.articleId} className="text-xs">
                        {cited ? <Tag color="green">{m.cited}</Tag> : null}
                        <Link href={ROUTES.kbArticle(x.articleId)}>
                          {titles[x.articleId] ?? x.articleId.slice(0, 8)}
                        </Link>{" "}
                        <Text type="secondary">v{x.version}</Text>
                      </span>
                    );
                  })}
                </Space>
              ),
            },
          ]}
        />
      )}
    </Space>
  );
}
