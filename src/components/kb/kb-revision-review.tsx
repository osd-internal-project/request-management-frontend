"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, Space, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { useRouter } from "next/navigation";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { fill, lineDiff, type KbArticle, type KbRevision } from "./kb-types";

const r = messages.kb.review;

/**
 * CD-260 — for a knowledge owner, a revision in review: what changed against
 * the published text, and approve or send back. Nothing for anyone else.
 */
export function KbRevisionReview({
  id,
  revisionId,
}: {
  id: string;
  revisionId: string;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [revision, setRevision] = useState<KbRevision | null>(null);
  const [current, setCurrent] = useState<KbArticle | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void appApi<KbRevision>(`kb/articles/${id}/revisions/${revisionId}`).then(
      (res) => res.ok && setRevision(res.data),
    );
    void appApi<KbArticle>(`kb/articles/${id}`).then(
      (res) => res.ok && setCurrent(res.data),
    );
  }, [id, revisionId]);

  if (!revision?.canReview || !current) return null;

  async function decide(path: "approve" | "send-back") {
    setBusy(true);
    const res = await appApi<{ version?: number }>(
      `kb/articles/${id}/${path}`,
      {
        method: "POST",
        body: JSON.stringify({
          revision_id: revisionId,
          note: note || undefined,
        }),
      },
    );
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    void message.success(
      path === "approve"
        ? fill(r.approved, { v: res.data.version ?? "" })
        : r.sentBack,
    );
    router.push(ROUTES.kbArticle(id));
  }

  const diff = lineDiff(current.body, revision.body);
  const titleChanged = current.title !== revision.title;

  return (
    <Card
      size="small"
      title={
        <Space>
          <Tag color="processing">{r.revisionStatuses.in_review}</Tag>
          {fill(r.revisionTitle, { n: current.articleNo })}
        </Space>
      }
    >
      <Space orientation="vertical" className="w-full">
        <Text>
          <Text strong>{r.changeNote}:</Text> {revision.changeNote || "—"} ·{" "}
          {r.writer}: {revision.createdBy}
        </Text>
        {current.audience !== revision.audience ? (
          <Alert
            type="warning"
            showIcon
            title={fill(messages.kb.audience.changed, {
              a: messages.kb.audience.options[current.audience],
              b: messages.kb.audience.options[revision.audience],
            })}
          />
        ) : null}
        {titleChanged ? (
          <Text>
            <Text delete type="danger">
              {current.title}
            </Text>{" "}
            → <Text type="success">{revision.title}</Text>
          </Text>
        ) : null}
        <pre className="max-h-80 overflow-auto rounded bg-black/[.03] p-3 text-xs leading-5 whitespace-pre-wrap">
          {diff.every((d) => d.kind === "same")
            ? r.noChange
            : diff.map((d, i) => (
                <div
                  key={i}
                  className={
                    d.kind === "add"
                      ? "bg-green-100 text-green-900"
                      : d.kind === "del"
                        ? "bg-red-100 text-red-900 line-through"
                        : ""
                  }
                >
                  {d.kind === "add" ? "+ " : d.kind === "del" ? "− " : "  "}
                  {d.text || " "}
                </div>
              ))}
        </pre>
        <Input.TextArea
          rows={2}
          maxLength={1000}
          placeholder={`${r.approveNote} / ${r.sendBackNote}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Space>
          <Button
            type="primary"
            loading={busy}
            onClick={() => void decide("approve")}
          >
            {r.approve}
          </Button>
          <Button
            danger
            loading={busy}
            disabled={!note.trim()}
            onClick={() => void decide("send-back")}
          >
            {r.sendBack}
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
