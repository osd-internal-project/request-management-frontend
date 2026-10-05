"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Skeleton, Space, Table, Tag } from "antd";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { shortDate } from "./kb-types";

const r = messages.kb.review;

interface Queue {
  canReview: boolean;
  pending: {
    kind: "new" | "revision";
    articleId: string;
    revisionId: string | null;
    articleNo: string;
    title: string;
    writer: string;
    submittedAt: string | null;
    changeNote: string | null;
  }[];
  dueReview: {
    articleId: string;
    articleNo: string;
    title: string;
    owner: string | null;
    nextReviewOn: string | null;
  }[];
}

/** CD-260 — drafts and revisions waiting for review; articles due for review. */
export function KbReviewQueue() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() =>
    new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10),
  );

  useEffect(() => {
    void appApi<Queue>("kb/review-queue").then((res) =>
      res.ok ? setQueue(res.data) : setError(res.message),
    );
  }, []);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!queue) return <Skeleton active />;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      {queue.canReview ? (
        <Card size="small" title={`${r.pending} (${queue.pending.length})`}>
          <Table
            rowKey={(row) => row.revisionId ?? row.articleId}
            size="small"
            pagination={false}
            dataSource={queue.pending}
            locale={{ emptyText: r.none }}
            scroll={{ x: 760 }}
            columns={[
              {
                title: r.kind,
                dataIndex: "kind",
                width: 120,
                render: (v: string) => <Tag>{r.kinds[v]}</Tag>,
              },
              {
                title: messages.kb.form.title,
                key: "title",
                render: (_, row) => (
                  <Link
                    href={
                      row.revisionId
                        ? ROUTES.kbRevision(row.articleId, row.revisionId)
                        : ROUTES.kbArticle(row.articleId)
                    }
                  >
                    {row.articleNo} · {row.title}
                  </Link>
                ),
              },
              {
                title: r.changeNote,
                dataIndex: "changeNote",
                render: (v: string | null) => v || "—",
              },
              { title: r.writer, dataIndex: "writer", width: 140 },
              {
                title: r.submittedAt,
                dataIndex: "submittedAt",
                width: 110,
                render: shortDate,
              },
            ]}
          />
        </Card>
      ) : null}
      <Card size="small" title={`${r.dueReview} (${queue.dueReview.length})`}>
        <Table
          rowKey="articleId"
          size="small"
          pagination={false}
          dataSource={queue.dueReview}
          locale={{ emptyText: r.none }}
          columns={[
            {
              title: messages.kb.form.title,
              key: "title",
              render: (_, row) => (
                <Link href={ROUTES.kbArticle(row.articleId)}>
                  {row.articleNo} · {row.title}
                </Link>
              ),
            },
            {
              title: r.owner,
              dataIndex: "owner",
              width: 160,
              render: (v: string | null) => v ?? "—",
            },
            {
              title: r.nextReview.replace(" {d}", ""),
              dataIndex: "nextReviewOn",
              width: 160,
              render: (v: string | null) =>
                v ? (
                  <Tag color={v < today ? "error" : "warning"}>
                    {shortDate(v)} ·{" "}
                    {v < today
                      ? r.reviewStates.overdue
                      : r.reviewStates.due_soon}
                  </Tag>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
