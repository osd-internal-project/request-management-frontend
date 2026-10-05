"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import {
  DislikeOutlined,
  EditOutlined,
  LikeOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { KbMarkdown } from "./kb-markdown";
import { fill, shortDate, STATUS_COLOR, type KbArticle } from "./kb-types";

const m = messages.kb;

/** CD-259 — one article: read it, say whether it helped, and (owners) act on it. */
export function KbArticleView({ id }: { id: string }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [article, setArticle] = useState<KbArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [voting, setVoting] = useState<boolean | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    | { user: string; helpful: boolean; comment: string | null; at: string }[]
    | null
  >(null);

  useEffect(() => {
    void appApi<KbArticle>(`kb/articles/${id}`).then((r) =>
      r.ok ? setArticle(r.data) : setError(r.message),
    );
  }, [id]);

  async function act(path: string, body: object, done: string) {
    setBusy(true);
    const r = await appApi<KbArticle>(`kb/articles/${id}/${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      void message.error(r.message);
      return false;
    }
    setArticle(r.data);
    void message.success(done);
    return true;
  }

  async function remove() {
    const r = await appApi(`kb/articles/${id}`, { method: "DELETE" });
    if (!r.ok) {
      void message.error(r.message);
      return;
    }
    void message.success(m.removed);
    router.push(ROUTES.kb);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!article) return <Skeleton active />;
  const a = article;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Link href={ROUTES.kb}>← {m.back}</Link>
      <div>
        <Space wrap size={6}>
          <Text type="secondary">{a.articleNo}</Text>
          <Tag color={STATUS_COLOR[a.status]}>{m.statuses[a.status]}</Tag>
          {a.category?.name ? <Tag>{a.category.name}</Tag> : null}
          {a.source !== "manual" ? (
            <Tag>{m.sources[a.source] ?? a.source}</Tag>
          ) : null}
        </Space>
        <Title level={3} className="!mb-1 !mt-1">
          {a.title}
        </Title>
        {a.summary ? <Text type="secondary">{a.summary}</Text> : null}
        <div className="mt-1">
          <Text type="secondary" className="text-xs">
            {fill(m.by, { n: a.author })} ·{" "}
            {a.publishedAt
              ? fill(m.published, { d: shortDate(a.publishedAt) })
              : fill(m.updated, { d: shortDate(a.updatedAt) })}{" "}
            · {fill(m.views, { n: a.views })}
          </Text>
        </div>
        <Space wrap size={4} className="mt-2">
          {a.productCodes.concat(a.productGroups).map((p) => (
            <Tag key={p} color="blue">
              {p}
            </Tag>
          ))}
          {a.tags.map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </Space>
      </div>

      {a.status === "draft" ? (
        <Alert type="info" showIcon title={m.draftNote} />
      ) : null}
      {a.status === "archived" ? (
        <Alert type="warning" showIcon title={m.archivedNote} />
      ) : null}

      <Space wrap>
        {a.canEdit ? (
          <Link href={ROUTES.kbEdit(a.id)}>
            <Button icon={<EditOutlined />}>{m.edit}</Button>
          </Link>
        ) : null}
        {a.canPublish ? (
          <Button
            type="primary"
            loading={busy}
            onClick={() => void act("publish", {}, m.published_)}
          >
            {m.publish}
          </Button>
        ) : null}
        {a.canArchive ? (
          <Button danger onClick={() => setArchiving("")}>
            {m.archive}
          </Button>
        ) : null}
        {a.status !== "draft" && (a.canPublish || a.canArchive) ? (
          <Button
            loading={busy}
            onClick={() => void act("reopen", {}, m.reopened)}
          >
            {m.reopen}
          </Button>
        ) : null}
        {a.status === "draft" && a.canEdit && !a.publishedAt ? (
          <Popconfirm title={m.removeConfirm} onConfirm={() => void remove()}>
            <Button danger type="text">
              {m.remove}
            </Button>
          </Popconfirm>
        ) : null}
        {a.canEdit || a.canPublish || a.canArchive ? (
          <Button
            type="link"
            onClick={() =>
              void appApi<typeof feedback>(`kb/articles/${id}/ratings`).then(
                (r) => r.ok && setFeedback(r.data),
              )
            }
          >
            {m.feedback}
          </Button>
        ) : null}
      </Space>

      <Card>
        <KbMarkdown body={a.body} />
      </Card>

      {a.files.length ? (
        <Card size="small" title={m.files}>
          <Space orientation="vertical" size={2}>
            {a.files.map((f) => (
              <a
                key={f.id}
                href={`/api/app/${f.url}`}
                target="_blank"
                rel="noreferrer"
              >
                <PaperClipOutlined /> {f.fileName}
              </a>
            ))}
          </Space>
        </Card>
      ) : null}

      {a.status === "published" ? (
        <Card size="small">
          <Space orientation="vertical" className="w-full">
            <Space wrap>
              <Text strong>{m.wasHelpful}</Text>
              <Button
                icon={<LikeOutlined />}
                type={a.myRating?.helpful === true ? "primary" : "default"}
                loading={busy && voting === true}
                onClick={() => {
                  setVoting(true);
                  void act("rate", { helpful: true }, m.thanks);
                }}
              >
                {m.yes}
              </Button>
              <Button
                icon={<DislikeOutlined />}
                type={a.myRating?.helpful === false ? "primary" : "default"}
                onClick={() => setVoting(false)}
              >
                {m.no}
              </Button>
              <Text type="secondary" className="text-xs">
                {a.helpfulPct === null
                  ? m.noRating
                  : fill(m.helpful, {
                      p: a.helpfulPct,
                      n: a.helpfulYes + a.helpfulNo,
                    })}
              </Text>
            </Space>
            {voting === false ? (
              <Space.Compact className="w-full">
                <Input
                  value={comment}
                  maxLength={1000}
                  placeholder={m.comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() =>
                    void act(
                      "rate",
                      { helpful: false, comment },
                      m.thanks,
                    ).then((ok) => ok && setVoting(null))
                  }
                >
                  {m.no}
                </Button>
              </Space.Compact>
            ) : null}
          </Space>
        </Card>
      ) : null}

      <Modal
        open={archiving !== null}
        title={m.archiveTitle}
        okText={m.archive}
        okButtonProps={{ danger: true, disabled: !archiving?.trim() }}
        confirmLoading={busy}
        onCancel={() => setArchiving(null)}
        onOk={() =>
          void act("archive", { reason: archiving }, m.archived).then(
            (ok) => ok && setArchiving(null),
          )
        }
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder={m.archiveReason}
          value={archiving ?? ""}
          onChange={(e) => setArchiving(e.target.value)}
        />
      </Modal>

      <Modal
        open={feedback !== null}
        title={m.feedback}
        footer={null}
        width={720}
        onCancel={() => setFeedback(null)}
      >
        <Table
          rowKey={(r) => `${r.user}-${r.at}`}
          size="small"
          pagination={false}
          dataSource={feedback ?? []}
          columns={[
            { title: "", dataIndex: "user", width: 160 },
            {
              title: "",
              dataIndex: "helpful",
              width: 90,
              render: (v: boolean) =>
                v ? (
                  <Tag color="success">{m.yes}</Tag>
                ) : (
                  <Tag color="error">{m.no}</Tag>
                ),
            },
            {
              title: "",
              dataIndex: "comment",
              render: (v: string | null) => v ?? "—",
            },
            { title: "", dataIndex: "at", width: 100, render: shortDate },
          ]}
        />
      </Modal>
    </Space>
  );
}
