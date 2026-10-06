"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  DislikeOutlined,
  EditOutlined,
  HistoryOutlined,
  LikeOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appApi } from "@/lib/api/client";
import { searchUsers } from "@/lib/api/client-roles";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { KbMarkdown } from "./kb-markdown";
import {
  AUDIENCE_COLOR,
  fill,
  lineDiff,
  REVIEW_COLOR,
  shortDate,
  STATUS_COLOR,
  type KbArticle,
  type KbCard,
} from "./kb-types";

const m = messages.kb;
const r = m.review;
const au = m.audience;

interface VersionRow {
  version: number;
  title: string;
  changeNote: string;
  writtenBy: string;
  approvedBy: string;
  approvedAt: string;
}

type Dialog =
  | {
      kind: "approve" | "sendBack" | "archive" | "withdrawCustomers";
      note: string;
    }
  | {
      kind: "owner";
      userId?: string;
      options: { value: string; label: string }[];
    }
  | {
      kind: "merge";
      intoId?: string;
      options: { value: string; label: string }[];
    }
  | null;

/** CD-259/260 — one article: read it, rate it, and move it through review. */
export function KbArticleView({ id }: { id: string }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [article, setArticle] = useState<KbArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [voting, setVoting] = useState<boolean | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [lookup, setLookup] = useState(false);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [compare, setCompare] = useState<{
    version: number;
    body: string;
  } | null>(null);
  const [origin, setOrigin] = useState<{
    usedOnJobs: number;
    aiCitations?: number;
    fromJobs: { requestId: string; requestNo: string | null }[];
    fromSolutions?: { solutionId: string; title: string | null }[];
    fromProblem: {
      id: string;
      problemNo: string;
      title: string;
      status: string;
    } | null;
  } | null>(null);
  const [feedback, setFeedback] = useState<
    | { user: string; helpful: boolean; comment: string | null; at: string }[]
    | null
  >(null);

  const load = useCallback(() => {
    void appApi<KbArticle>(`kb/articles/${id}`).then((res) =>
      res.ok ? setArticle(res.data) : setError(res.message),
    );
  }, [id]);

  useEffect(() => load(), [load]);

  // CD-262 — where it came from, and how often it fixed a job
  useEffect(() => {
    void appApi<NonNullable<typeof origin>>(
      `kb/articles/${id}/provenance`,
    ).then((res) => res.ok && setOrigin(res.data));
  }, [id]);

  // A merged duplicate sends its readers on to the main article.
  useEffect(() => {
    if (!article?.mergedInto) return;
    void message.info(
      fill(r.mergedNotice, { n: article.mergedInto.articleNo }),
    );
    router.replace(ROUTES.kbArticle(article.mergedInto.id));
  }, [article, message, router]);

  async function post<T>(
    path: string,
    body: object,
    done: string,
    method = "POST",
  ) {
    setBusy(true);
    const res = await appApi<T>(`kb/articles/${id}/${path}`, {
      method,
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return null;
    }
    if (done) void message.success(done);
    load();
    return res.data;
  }

  async function remove() {
    const res = await appApi(`kb/articles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    void message.success(m.removed);
    router.push(ROUTES.kb);
  }

  async function revise() {
    setBusy(true);
    const res = await appApi<{ id: string }>(`kb/articles/${id}/revisions`, {
      method: "POST",
      body: "{}",
    });
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    router.push(ROUTES.kbRevision(id, res.data.id));
  }

  async function findPeople(term: string) {
    if (dialog?.kind !== "owner") return;
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
    if (dialog?.kind !== "merge") return;
    setLookup(true);
    const res = await appApi<{ items: KbCard[] }>(
      `kb/articles?limit=20${term.trim() ? `&q=${encodeURIComponent(term.trim())}` : ""}`,
    );
    setLookup(false);
    setDialog({
      ...dialog,
      options: res.ok
        ? res.data.items
            .filter((a) => a.id !== id)
            .map((a) => ({ value: a.id, label: `${a.articleNo} · ${a.title}` }))
        : [],
    });
  }

  async function confirmDialog() {
    if (!dialog) return;
    let ok: unknown = null;
    if (dialog.kind === "approve") {
      const res = await post<{ version: number }>(
        "approve",
        { note: dialog.note || undefined },
        "",
      );
      if (res) void message.success(fill(r.approved, { v: res.version }));
      ok = res;
    } else if (dialog.kind === "sendBack") {
      ok = await post("send-back", { note: dialog.note }, r.sentBack);
    } else if (dialog.kind === "archive") {
      ok = await post("archive", { reason: dialog.note }, m.archived);
    } else if (dialog.kind === "withdrawCustomers") {
      ok = await post(
        "withdraw-from-customers",
        { reason: dialog.note },
        au.withdrawn,
      );
    } else if (dialog.kind === "owner" && dialog.userId) {
      ok = await post(
        "owner",
        { user_id: dialog.userId },
        r.ownerChanged,
        "PUT",
      );
    } else if (dialog.kind === "merge" && dialog.intoId) {
      ok = await post("merge", { into_id: dialog.intoId }, r.merged);
    }
    if (ok) setDialog(null);
  }

  async function openCompare(version: number) {
    const res = await appApi<{ body: string }>(
      `kb/articles/${id}/versions/${version}`,
    );
    if (res.ok) setCompare({ version, body: res.data.body });
    else void message.error(res.message);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!article || article.mergedInto) return <Skeleton active />;
  const a = article;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Link href={ROUTES.kb}>← {m.back}</Link>
      <div>
        <Space wrap size={6}>
          <Text type="secondary">{a.articleNo}</Text>
          <Tag color={STATUS_COLOR[a.status]}>{m.statuses[a.status]}</Tag>
          {a.version ? <Tag>{fill(r.version, { v: a.version })}</Tag> : null}
          <Tag color={AUDIENCE_COLOR[a.audience]}>{au.tags[a.audience]}</Tag>
          {a.category?.name ? <Tag>{a.category.name}</Tag> : null}
          {a.source !== "manual" ? (
            <Tag>{m.sources[a.source] ?? a.source}</Tag>
          ) : null}
          {REVIEW_COLOR[a.reviewState] ? (
            <Tag color={REVIEW_COLOR[a.reviewState]}>
              {r.reviewStates[a.reviewState]}
            </Tag>
          ) : null}
        </Space>
        <Title level={3} className="!mb-1 !mt-1">
          {a.title}
        </Title>
        {a.summary ? <Text type="secondary">{a.summary}</Text> : null}
        <div className="mt-1">
          <Text type="secondary" className="text-xs">
            {fill(m.by, { n: a.author })}
            {a.owner ? ` · ${r.owner}: ${a.owner}` : ""} ·{" "}
            {a.publishedAt
              ? fill(m.published, { d: shortDate(a.publishedAt) })
              : fill(m.updated, { d: shortDate(a.updatedAt) })}{" "}
            · {fill(m.views, { n: a.views })}
            {a.nextReviewOn && a.status === "published"
              ? ` · ${fill(r.nextReview, { d: shortDate(a.nextReviewOn) })}`
              : ""}
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
        {origin &&
        (origin.usedOnJobs ||
          origin.fromJobs.length ||
          origin.fromSolutions?.length ||
          origin.fromProblem) ? (
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              {origin.usedOnJobs
                ? fill(messages.kb.field.usedOn, { n: origin.usedOnJobs })
                : ""}
              {origin.fromJobs.length ? (
                <>
                  {origin.usedOnJobs ? " · " : ""}
                  {messages.kb.field.fromJobs}{" "}
                  {origin.fromJobs.map((j, i) => (
                    <span key={j.requestId}>
                      {i ? ", " : ""}
                      <Link href={ROUTES.requestDetail(j.requestId)}>
                        {j.requestNo ?? messages.kb.field.job}
                      </Link>
                    </span>
                  ))}
                </>
              ) : null}
              {origin.fromSolutions?.length ? (
                <>
                  {origin.usedOnJobs || origin.fromJobs.length ? " · " : ""}
                  {messages.kb.field.fromSolutions}{" "}
                  {origin.fromSolutions.map((sol, i) => (
                    <span key={sol.solutionId}>
                      {i ? ", " : ""}
                      <Link href={ROUTES.solutionDetail(sol.solutionId)}>
                        {sol.title ?? "Solution"}
                      </Link>
                    </span>
                  ))}
                </>
              ) : null}
              {origin.fromProblem ? (
                <>
                  {origin.usedOnJobs ||
                  origin.fromJobs.length ||
                  origin.fromSolutions?.length
                    ? " · "
                    : ""}
                  {messages.kb.field.fromProblem}{" "}
                  <Link href={ROUTES.serviceProblems}>
                    {origin.fromProblem.problemNo}
                  </Link>
                </>
              ) : null}
            </Text>
          </div>
        ) : null}
        {origin?.aiCitations ? (
          <div>
            <Link
              href={`${ROUTES.kbAi}?article_id=${a.id}`}
              className="text-xs"
            >
              {fill(messages.kb.ai.citedCount, { n: origin.aiCitations })}
            </Link>
          </div>
        ) : null}
        {a.customers.length ? (
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              {au.customers}:{" "}
              {a.customers.map((c) => `${c.code} · ${c.name}`).join(", ")}
            </Text>
          </div>
        ) : null}
        {a.audience !== "internal" && a.status === "published" ? (
          <div>
            <Text type="secondary" className="text-xs">
              {fill(au.portalStats, {
                v: a.portalViews,
                y: a.portalHelpfulYes,
                n: a.portalHelpfulNo,
              })}
            </Text>
          </div>
        ) : null}
      </div>

      {a.status === "draft" && a.reviewNote ? (
        <Alert
          type="warning"
          showIcon
          title={fill(r.returnedNote, {
            n: a.reviewedBy ?? "",
            t: a.reviewNote,
          })}
        />
      ) : a.status === "draft" ? (
        <Alert type="info" showIcon title={m.draftNote} />
      ) : null}
      {a.status === "in_review" ? (
        <Alert
          type="info"
          showIcon
          title={fill(r.inReviewNote, { d: shortDate(a.submittedAt) })}
        />
      ) : null}
      {a.status === "archived" ? (
        <Alert type="warning" showIcon title={m.archivedNote} />
      ) : null}
      {a.openRevision ? (
        <Alert
          type="info"
          showIcon
          title={fill(r.revisionPending, {
            s:
              r.revisionStatuses[a.openRevision.status] ??
              a.openRevision.status,
          })}
          action={
            a.openRevision.id ? (
              <Link href={ROUTES.kbRevision(a.id, a.openRevision.id)}>
                <Button size="small">{r.continueRevision}</Button>
              </Link>
            ) : null
          }
        />
      ) : null}

      <Space wrap>
        {a.canEdit ? (
          <Link href={ROUTES.kbEdit(a.id)}>
            <Button icon={<EditOutlined />}>{m.edit}</Button>
          </Link>
        ) : null}
        {a.canSubmit ? (
          <Button
            type="primary"
            loading={busy}
            onClick={() => void post("submit", {}, r.submitted)}
          >
            {r.submit}
          </Button>
        ) : null}
        {a.canWithdraw ? (
          <Button
            loading={busy}
            onClick={() => void post("withdraw", {}, r.withdrawn)}
          >
            {r.withdraw}
          </Button>
        ) : null}
        {a.canApprove ? (
          <Button
            type="primary"
            onClick={() => setDialog({ kind: "approve", note: "" })}
          >
            {r.approve}
          </Button>
        ) : null}
        {a.canSendBack ? (
          <Button
            danger
            onClick={() => setDialog({ kind: "sendBack", note: "" })}
          >
            {r.sendBack}
          </Button>
        ) : null}
        {a.canRevise ? (
          <Button
            icon={<EditOutlined />}
            loading={busy}
            onClick={() => void revise()}
          >
            {r.revise}
          </Button>
        ) : null}
        {a.canConfirmReview && a.reviewState !== "ok" ? (
          <Button
            loading={busy}
            onClick={() =>
              void post<{ nextReviewOn: string }>("reviewed", {}, "").then(
                (res) =>
                  res &&
                  void message.success(
                    fill(r.confirmed, { d: shortDate(res.nextReviewOn) }),
                  ),
              )
            }
          >
            {r.confirmReview}
          </Button>
        ) : null}
        {a.version ? (
          <Button
            icon={<HistoryOutlined />}
            onClick={() =>
              void appApi<VersionRow[]>(`kb/articles/${id}/versions`).then(
                (res) => res.ok && setVersions(res.data),
              )
            }
          >
            {r.versions}
          </Button>
        ) : null}
        {a.canSetOwner ? (
          <Button
            type="link"
            onClick={() => setDialog({ kind: "owner", options: [] })}
          >
            {r.changeOwner}
          </Button>
        ) : null}
        {a.canMerge ? (
          <Button
            type="link"
            onClick={() => setDialog({ kind: "merge", options: [] })}
          >
            {r.merge}
          </Button>
        ) : null}
        {a.canArchive && a.audience !== "internal" ? (
          <Button
            danger
            type="link"
            onClick={() => setDialog({ kind: "withdrawCustomers", note: "" })}
          >
            {au.withdraw}
          </Button>
        ) : null}
        {a.canArchive ? (
          <Button
            danger
            type="link"
            onClick={() => setDialog({ kind: "archive", note: "" })}
          >
            {m.archive}
          </Button>
        ) : null}
        {a.canReopen ? (
          <Button
            type="link"
            loading={busy}
            onClick={() => void post("reopen", {}, m.reopened)}
          >
            {r.reopen}
          </Button>
        ) : null}
        {a.status === "draft" && a.canEdit && !a.publishedAt ? (
          <Popconfirm title={m.removeConfirm} onConfirm={() => void remove()}>
            <Button danger type="text">
              {m.remove}
            </Button>
          </Popconfirm>
        ) : null}
        {a.canEdit || a.canApprove || a.canArchive || a.canConfirmReview ? (
          <Button
            type="link"
            onClick={() =>
              void appApi<typeof feedback>(`kb/articles/${id}/ratings`).then(
                (res) => res.ok && setFeedback(res.data),
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
                  void post("rate", { helpful: true }, m.thanks);
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
                    void post(
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
        open={!!dialog}
        title={
          dialog?.kind === "approve"
            ? r.approveTitle
            : dialog?.kind === "sendBack"
              ? r.sendBackTitle
              : dialog?.kind === "archive"
                ? m.archiveTitle
                : dialog?.kind === "withdrawCustomers"
                  ? au.withdrawTitle
                  : dialog?.kind === "owner"
                    ? r.changeOwner
                    : r.mergeTitle
        }
        confirmLoading={busy}
        okButtonProps={{
          danger:
            dialog?.kind === "sendBack" ||
            dialog?.kind === "archive" ||
            dialog?.kind === "withdrawCustomers",
          disabled:
            ((dialog?.kind === "sendBack" ||
              dialog?.kind === "archive" ||
              dialog?.kind === "withdrawCustomers") &&
              !dialog.note.trim()) ||
            (dialog?.kind === "owner" && !dialog.userId) ||
            (dialog?.kind === "merge" && !dialog.intoId),
        }}
        onCancel={() => setDialog(null)}
        onOk={() => void confirmDialog()}
      >
        {dialog && "note" in dialog ? (
          <Space orientation="vertical" className="w-full">
            {dialog.kind === "approve" && a.audience !== "internal" ? (
              <Alert
                type="warning"
                showIcon
                title={fill(au.approveWarning, { a: au.options[a.audience] })}
              />
            ) : null}
            {dialog.kind === "withdrawCustomers" ? (
              <Text type="secondary">{au.withdrawHint}</Text>
            ) : null}
            <Input.TextArea
              rows={3}
              maxLength={1000}
              placeholder={
                dialog.kind === "approve"
                  ? r.approveNote
                  : dialog.kind === "sendBack"
                    ? r.sendBackNote
                    : dialog.kind === "withdrawCustomers"
                      ? au.withdrawReason
                      : m.archiveReason
              }
              value={dialog.note}
              onChange={(e) => setDialog({ ...dialog, note: e.target.value })}
            />
          </Space>
        ) : dialog?.kind === "owner" ? (
          <Select
            className="w-full"
            showSearch
            filterOption={false}
            placeholder={r.pickPerson}
            value={dialog.userId}
            onChange={(v) => setDialog({ ...dialog, userId: v })}
            onSearch={(t) => void findPeople(t)}
            onFocus={() => !dialog.options.length && void findPeople("")}
            notFoundContent={lookup ? <Spin size="small" /> : null}
            options={dialog.options}
          />
        ) : dialog?.kind === "merge" ? (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{r.mergeHint}</Text>
            <Select
              className="w-full"
              showSearch
              filterOption={false}
              placeholder={r.mergeTarget}
              value={dialog.intoId}
              onChange={(v) => setDialog({ ...dialog, intoId: v })}
              onSearch={(t) => void findArticles(t)}
              onFocus={() => !dialog.options.length && void findArticles("")}
              notFoundContent={lookup ? <Spin size="small" /> : null}
              options={dialog.options}
            />
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={versions !== null}
        title={r.versions}
        footer={null}
        width={860}
        onCancel={() => setVersions(null)}
      >
        <Table<VersionRow>
          rowKey="version"
          size="small"
          pagination={false}
          dataSource={versions ?? []}
          columns={[
            { title: r.versionCols.version, dataIndex: "version", width: 80 },
            {
              title: r.versionCols.changeNote,
              dataIndex: "changeNote",
              render: (v: string) => v || "—",
            },
            {
              title: r.versionCols.writtenBy,
              dataIndex: "writtenBy",
              width: 130,
            },
            {
              title: r.versionCols.approvedBy,
              dataIndex: "approvedBy",
              width: 130,
            },
            {
              title: r.versionCols.approvedAt,
              dataIndex: "approvedAt",
              width: 100,
              render: shortDate,
            },
            {
              key: "compare",
              width: 150,
              render: (_, row) =>
                row.version === a.version ? null : (
                  <Button
                    size="small"
                    onClick={() => void openCompare(row.version)}
                  >
                    {r.compare}
                  </Button>
                ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={!!compare}
        title={
          compare
            ? fill(r.compareTitle, { a: compare.version, b: a.version })
            : ""
        }
        footer={null}
        width={900}
        onCancel={() => setCompare(null)}
      >
        {compare ? (
          <pre className="max-h-[60vh] overflow-auto rounded bg-black/[.03] p-3 text-xs leading-5 whitespace-pre-wrap">
            {(() => {
              const diff = lineDiff(compare.body, a.body);
              if (diff.every((d) => d.kind === "same")) return r.noChange;
              return diff.map((d, i) => (
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
              ));
            })()}
          </pre>
        ) : null}
      </Modal>

      <Modal
        open={feedback !== null}
        title={m.feedback}
        footer={null}
        width={720}
        onCancel={() => setFeedback(null)}
      >
        <Table
          rowKey={(row) => `${row.user}-${row.at}`}
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
