"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { fill, shortDate } from "./kb-types";

const f = messages.kb.field;

interface Item {
  id: string;
  requestId: string;
  requestNo: string | null;
  title: string;
  cause: string;
  resolution: string;
  product: string | null;
  groupKey: string;
  customer: string | null;
  closedAt: string;
  status: string;
  article: { id: string; articleNo: string; title: string } | null;
  skipReason: string | null;
}

/** CD-262 — closed service jobs, picked into drafts by product, or skipped. */
export function KbFieldInbox() {
  const { message } = App.useApp();
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{
    kind: "draft" | "skip";
    text: string;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<{ items: Item[] }>(`kb/field-inbox?status=${status}`).then(
      (res) => {
        if (!live) return;
        if (res.ok) {
          setItems(res.data.items);
          setError(null);
        } else setError(res.message);
      },
    );
    return () => {
      live = false;
    };
  }, [status, version]);

  async function confirm() {
    if (!dialog) return;
    setBusy(true);
    const res =
      dialog.kind === "draft"
        ? await appApi<{ articleId: string; articleNo: string }>(
            "kb/field-inbox/draft",
            {
              method: "POST",
              body: JSON.stringify({
                ids: picked,
                title: dialog.text || undefined,
              }),
            },
          )
        : await appApi("kb/field-inbox/skip", {
            method: "POST",
            body: JSON.stringify({ ids: picked, reason: dialog.text }),
          });
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    setDialog(null);
    setPicked([]);
    if (dialog.kind === "draft") {
      const data = res.data as { articleId: string; articleNo: string };
      void message.success(fill(f.drafted, { n: data.articleNo }));
      router.push(ROUTES.kbEdit(data.articleId));
      return;
    }
    void message.success(f.skipped);
    setVersion((v) => v + 1);
  }

  const groups = new Map<string, Item[]>();
  for (const item of items ?? []) {
    const key = item.groupKey || "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const toggle = (id: string, on: boolean) =>
    setPicked(on ? [...picked, id] : picked.filter((p) => p !== id));

  const list = error ? (
    <Alert type="error" showIcon title={error} />
  ) : !items ? (
    <Skeleton active />
  ) : !items.length ? (
    <Empty description={f.none} />
  ) : (
    <Space orientation="vertical" className="w-full" size="middle">
      {[...groups.entries()].map(([key, rows]) => (
        <Card
          key={key || "none"}
          size="small"
          title={`${rows[0].product ?? f.noProduct} (${rows.length})`}
        >
          <Space orientation="vertical" className="w-full">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex gap-3 border-b pb-2 last:border-b-0"
              >
                {status === "pending" ? (
                  <Checkbox
                    checked={picked.includes(row.id)}
                    onChange={(e) => toggle(row.id, e.target.checked)}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Space wrap size={6}>
                    <Text strong>{row.title}</Text>
                    <Link href={ROUTES.requestDetail(row.requestId)}>
                      <Tag>{row.requestNo ?? f.job}</Tag>
                    </Link>
                    {row.customer ? (
                      <Text type="secondary">{row.customer}</Text>
                    ) : null}
                    <Text type="secondary" className="text-xs">
                      {f.closedAt} {shortDate(row.closedAt)}
                    </Text>
                  </Space>
                  <div className="text-sm">
                    <Text type="secondary">{f.cause}:</Text> {row.cause}
                  </div>
                  <div className="text-sm">
                    <Text type="secondary">{f.fix}:</Text> {row.resolution}
                  </div>
                  {row.article ? (
                    <Link href={ROUTES.kbArticle(row.article.id)}>
                      {f.article}: {row.article.articleNo} · {row.article.title}
                    </Link>
                  ) : null}
                  {row.skipReason ? (
                    <Text type="secondary" className="text-xs">
                      {f.reason}: {row.skipReason}
                    </Text>
                  ) : null}
                </div>
              </div>
            ))}
          </Space>
        </Card>
      ))}
    </Space>
  );

  return (
    <Space orientation="vertical" className="w-full">
      <Tabs
        activeKey={status}
        onChange={(key) => {
          setStatus(key);
          setPicked([]);
          setItems(null);
        }}
        items={["pending", "drafted", "skipped"].map((key) => ({
          key,
          label: f.tabs[key],
        }))}
      />
      {status === "pending" && picked.length ? (
        <Space wrap>
          <Text>{fill(f.selected, { n: picked.length })}</Text>
          <Button
            type="primary"
            onClick={() => setDialog({ kind: "draft", text: "" })}
          >
            {f.draft}
          </Button>
          <Button onClick={() => setDialog({ kind: "skip", text: "" })}>
            {f.skip}
          </Button>
        </Space>
      ) : null}
      {list}
      <Modal
        open={!!dialog}
        title={dialog?.kind === "draft" ? f.draftTitle : f.skipTitle}
        confirmLoading={busy}
        okButtonProps={{
          disabled: dialog?.kind === "skip" && !dialog.text.trim(),
        }}
        onCancel={() => setDialog(null)}
        onOk={() => void confirm()}
      >
        {dialog ? (
          <Input
            maxLength={dialog.kind === "draft" ? 200 : 500}
            placeholder={dialog.kind === "draft" ? f.draftName : f.skipReason}
            value={dialog.text}
            onChange={(e) => setDialog({ ...dialog, text: e.target.value })}
          />
        ) : null}
      </Modal>
    </Space>
  );
}
