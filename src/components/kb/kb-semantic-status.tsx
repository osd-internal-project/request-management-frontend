"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Progress, Skeleton, Space, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { fill } from "./kb-types";

const m = messages.kb.ai.semantic;

interface Status {
  mode: string;
  model: string;
  enabled: boolean;
  minSimilarity: number;
  published: number;
  indexed: number;
  passages: number;
  pending: number;
}

/** CD-267 — how much of the knowledge base can be searched by meaning. */
export function KbSemanticStatus() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void appApi<Status>("kb/semantic").then((res) => {
      if (!live) return;
      if (res.ok) setStatus(res.data);
      else setError(res.message);
    });
    return () => {
      live = false;
    };
  }, []);

  async function indexNow() {
    setBusy(true);
    const res = await appApi<Status & { embedded: number; passages: number }>(
      "kb/semantic/index",
      { method: "POST", body: "{}" },
    );
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    void message.success(
      fill(m.done, { n: res.data.embedded, p: res.data.passages }),
    );
    // the response's `passages` is the count just made; reload the totals
    const fresh = await appApi<Status>("kb/semantic");
    if (fresh.ok) setStatus(fresh.data);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!status) return <Skeleton active paragraph={{ rows: 1 }} />;

  const pct = status.published
    ? Math.round((100 * status.indexed) / status.published)
    : 0;
  return (
    <Space orientation="vertical" className="w-full" size={4}>
      <Text strong>{m.title}</Text>
      <Text type="secondary" className="text-xs">
        {m.hint}
      </Text>
      {!status.enabled ? <Alert type="warning" showIcon title={m.off} /> : null}
      <Progress percent={pct} size="small" className="max-w-md" />
      <Space wrap size={6}>
        <Text>
          {fill(m.indexed, {
            i: status.indexed,
            p: status.published,
            n: status.passages,
          })}
        </Text>
        {status.pending ? (
          <Tag color="warning">{fill(m.pending, { n: status.pending })}</Tag>
        ) : null}
        <Tag>
          {m.model}: {status.model}
        </Tag>
        <Tag color={status.mode === "mock" ? "default" : "green"}>
          {m.mode}: {status.mode}
        </Tag>
        <Tag>
          {m.minSimilarity}: {status.minSimilarity}
        </Tag>
        <Button
          size="small"
          loading={busy}
          disabled={!status.enabled || !status.pending}
          onClick={() => void indexNow()}
        >
          {m.indexNow}
        </Button>
      </Space>
    </Space>
  );
}
