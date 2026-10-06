"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Empty, Input, Spin, Tag } from "antd";
import {
  ArrowLeftOutlined,
  DislikeOutlined,
  LikeOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import dayjs from "dayjs";
import { KbMarkdown } from "@/components/kb/kb-markdown";
import { messages } from "@/lib/messages";
import { call } from "./portal-api";

const m = messages.service.assets.portal.public.articles;

interface ArticleItem {
  id: string;
  articleNo: string;
  title: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  forYourEquipment: boolean;
  publishedAt: string | null;
  helpfulPct: number | null;
}

interface Article {
  id: string;
  articleNo: string;
  title: string;
  summary: string | null;
  body: string;
  category: string | null;
  tags: string[];
  publishedAt: string | null;
  files: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }[];
  myVote: boolean | null;
}

/**
 * CD-249 / CD-261 — the knowledge articles published to this customer, the
 * ones about their own equipment first. Read-only, with a helpful/not vote;
 * when an article does not solve it the customer can go straight on to
 * raising a case (only when the portal accepts cases).
 */
export function PortalArticles({
  onRaise,
}: {
  onRaise: ((subject: string) => void) | null;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ArticleItem[] | null>(null);
  const [open, setOpen] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const q = query.trim();
    void call<{ items: ArticleItem[] }>(
      `articles${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ).then((result) => {
      if (!live) return;
      if (result.ok) {
        setError(null);
        setItems(result.data.items);
      } else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [query]);

  async function read(id: string) {
    setBusy(true);
    const result = await call<Article>(`articles/${id}`);
    setBusy(false);
    if (result.ok) {
      setError(null);
      setOpen(result.data);
    } else setError(result.message);
  }

  async function vote(helpful: boolean) {
    if (!open) return;
    const result = await call<{ myVote: boolean | null }>(
      `articles/${open.id}/vote`,
      { method: "POST", body: JSON.stringify({ helpful }) },
    );
    if (result.ok) setOpen({ ...open, myVote: result.data.myVote });
    else setError(result.message);
  }

  if (open) {
    return (
      <div className="space-y-3">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="px-0!"
          onClick={() => setOpen(null)}
        >
          {m.back}
        </Button>
        {error && <Alert type="error" showIcon title={error} />}
        <div>
          <Text type="secondary" className="text-xs">
            {open.articleNo}
            {open.category && ` · ${open.category}`}
            {open.publishedAt &&
              ` · ${dayjs(open.publishedAt).format("DD/MM/YYYY")}`}
          </Text>
          <Title level={4} className="mt-1!">
            {open.title}
          </Title>
          {open.summary && <Text type="secondary">{open.summary}</Text>}
        </div>
        <KbMarkdown body={open.body} via="portal" />
        {open.files.length > 0 && (
          <div>
            <Text strong className="block">
              {m.files}
            </Text>
            {open.files.map((file) => (
              <div key={file.id}>
                <a
                  href={`/api/public/portal/articles/${open.id}/files/${file.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PaperClipOutlined /> {file.fileName}
                </a>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
          <Text>{m.helpfulQuestion}</Text>
          <Button
            size="small"
            icon={<LikeOutlined />}
            type={open.myVote === true ? "primary" : "default"}
            onClick={() => void vote(true)}
          >
            {m.yes}
          </Button>
          <Button
            size="small"
            icon={<DislikeOutlined />}
            type={open.myVote === false ? "primary" : "default"}
            onClick={() => void vote(false)}
          >
            {m.no}
          </Button>
          {open.myVote !== null && (
            <Text type="secondary" className="text-xs">
              {m.thanks}
            </Text>
          )}
          {open.myVote === false && onRaise && (
            <Button size="small" onClick={() => onRaise(open.title)}>
              {m.stillStuck}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input.Search
        allowClear
        maxLength={200}
        placeholder={m.search}
        onSearch={(value) => setQuery(value)}
      />
      {error && <Alert type="error" showIcon title={error} />}
      {items === null ? (
        <div className="py-6 text-center">
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty description={query.trim() ? m.noMatch : m.empty} />
      ) : (
        <Spin spinning={busy}>
          <ul className="divide-y divide-black/10">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <button
                  type="button"
                  className="w-full cursor-pointer text-left"
                  onClick={() => void read(item.id)}
                >
                  <span className="text-[15px] font-medium text-[#1677ff]">
                    {item.title}
                  </span>{" "}
                  {item.forYourEquipment && <Tag color="green">{m.forYou}</Tag>}
                  {item.summary && (
                    <span className="block text-black/70">{item.summary}</span>
                  )}
                  <Text type="secondary" className="block text-xs">
                    {[
                      item.category,
                      item.helpfulPct === null
                        ? null
                        : m.helpfulPct(item.helpfulPct),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </button>
              </li>
            ))}
          </ul>
        </Spin>
      )}
    </div>
  );
}
