"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Space, Tag } from "antd";
import { BookOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const f = messages.kb.field;

interface Suggestions {
  suggestions: {
    id: string;
    articleNo: string;
    title: string;
    summary: string | null;
    used: boolean;
  }[];
  used: { id: string; articleNo: string; title: string }[];
}

/**
 * CD-262 — on a service job: knowledge articles for its equipment and
 * subject, and the one that fixed it (recorded by the technician).
 */
export function KbSuggestions({ workOrderId }: { workOrderId: string }) {
  const { message } = App.useApp();
  const [data, setData] = useState<Suggestions | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<Suggestions>(`kb/work-orders/${workOrderId}/suggestions`).then(
      (res) => live && res.ok && setData(res.data),
    );
    return () => {
      live = false;
    };
  }, [workOrderId]);

  async function mark(articleId: string, used: boolean) {
    setBusy(articleId);
    const res = await appApi<Suggestions>(
      `kb/work-orders/${workOrderId}/uses`,
      {
        method: "POST",
        body: JSON.stringify({ article_id: articleId, used }),
      },
    );
    setBusy(null);
    if (res.ok) setData(res.data);
    else void message.error(res.message);
  }

  if (!data) return null;
  const extra = data.used.filter(
    (u) => !data.suggestions.some((s) => s.id === u.id),
  );

  return (
    <Card
      size="small"
      title={
        <Space>
          <BookOutlined />
          {f.suggestTitle}
        </Space>
      }
    >
      {!data.suggestions.length && !extra.length ? (
        <Text type="secondary">{f.suggestNone}</Text>
      ) : (
        <Space orientation="vertical" className="w-full" size={6}>
          {[
            ...data.suggestions,
            ...extra.map((u) => ({ ...u, summary: null, used: true })),
          ].map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={ROUTES.kbArticle(a.id)} target="_blank">
                  {a.articleNo} · {a.title}
                </Link>
                {a.summary ? (
                  <div>
                    <Text type="secondary" className="text-xs">
                      {a.summary}
                    </Text>
                  </div>
                ) : null}
              </div>
              {a.used ? (
                <Space size={4}>
                  <Tag color="success">{f.usedIt}</Tag>
                  <Button
                    size="small"
                    type="link"
                    loading={busy === a.id}
                    onClick={() => void mark(a.id, false)}
                  >
                    {f.unuse}
                  </Button>
                </Space>
              ) : (
                <Button
                  size="small"
                  loading={busy === a.id}
                  onClick={() => void mark(a.id, true)}
                >
                  {f.useIt}
                </Button>
              )}
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}
