"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Input, Select, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ContractClause,
  DraftReviews,
  ReviewComment,
  ReviewRound,
} from "@/lib/api/contracts";
import { messages } from "@/lib/messages";

const m = messages.contracts.review;
const at = (value: string) => dayjs(value).format("D MMM YY HH:mm");

/**
 * CD-147 — ตรวจสัญญา: review rounds of a draft. A round is opened on the
 * latest version; reviewers comment clause by clause; the drafter answers
 * each — fixed or not fixed with the reason — seeing whether the clause has
 * changed since; the round closes once every comment is answered.
 */
export function ContractReviewPanel({
  draftId,
  reviews,
  roundClauses,
  canManage,
  editable,
}: {
  readonly draftId: string;
  readonly reviews: DraftReviews;
  /** The clauses of the open round's version, to comment on. */
  readonly roundClauses: ContractClause[];
  readonly canManage: boolean;
  readonly editable: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [clauseKey, setClauseKey] = useState<string | undefined>();
  const [body, setBody] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const openRound = reviews.rounds.find((round) => round.status === "open");
  const acting = canManage && editable;

  async function call(path: string, payload: unknown, done?: string) {
    setBusy(true);
    setError(null);
    const result = await appApi(path, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    if (done) message.success(done);
    router.refresh();
    return true;
  }

  const commentRow = (comment: ReviewComment, round: ReviewRound) => (
    <div key={comment.id} className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Text strong className="text-sm">
          {comment.clauseHeading}
        </Text>
        <Tag color={m.commentColor[comment.status]}>
          {m.commentStatus[comment.status]}
        </Tag>
        {comment.status === "resolved" && comment.resolvedInVersion && (
          <Text type="secondary" className="text-xs">
            {m.resolvedIn(comment.resolvedInVersion)}
          </Text>
        )}
        {comment.status === "open" && (
          <Text
            type={comment.changedSince ? "success" : "secondary"}
            className="text-xs"
          >
            {comment.changedSince ? m.changedSince : m.notChangedSince}
          </Text>
        )}
      </div>
      <Text className="block text-sm whitespace-pre-line">{comment.body}</Text>
      <Text type="secondary" className="block text-xs">
        {comment.createdByName} · {at(comment.createdAt)}
      </Text>
      {comment.response && (
        <div className="mt-1 rounded bg-black/[.04] p-2">
          <Text className="block text-xs whitespace-pre-line">
            {comment.response}
          </Text>
          {comment.respondedAt && (
            <Text type="secondary" className="text-xs">
              {comment.respondedByName} · {at(comment.respondedAt)}
            </Text>
          )}
        </div>
      )}
      {acting && round.status === "open" && (
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <Input.TextArea
            className="min-w-60 flex-1"
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={4000}
            placeholder={m.response}
            aria-label={m.response}
            value={answers[comment.id] ?? ""}
            onChange={(event) =>
              setAnswers({ ...answers, [comment.id]: event.target.value })
            }
          />
          <Button
            size="small"
            disabled={busy}
            onClick={() =>
              void call(`contract-review-comments/${comment.id}/answer`, {
                status: "resolved",
                response: answers[comment.id],
              })
            }
          >
            {m.resolve}
          </Button>
          <Button
            size="small"
            disabled={busy}
            onClick={() => {
              if (!answers[comment.id]?.trim()) {
                setError(m.reasonRequired);
                return;
              }
              void call(`contract-review-comments/${comment.id}/answer`, {
                status: "declined",
                response: answers[comment.id],
              });
            }}
          >
            {m.decline}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card size="small" title={m.title}>
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert type="error" showIcon className="mb-2" title={error} />}

      {acting && !openRound && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            className="max-w-sm"
            value={note}
            maxLength={1000}
            placeholder={m.openNote}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            type="primary"
            loading={busy}
            onClick={async () => {
              if (await call(`contract-drafts/${draftId}/reviews`, { note }, m.opened)) {
                setNote("");
              }
            }}
          >
            {m.open}
          </Button>
        </div>
      )}

      {reviews.rounds.length === 0 && (
        <Text type="secondary">{m.noRounds}</Text>
      )}

      <div className="flex flex-col gap-3">
        {reviews.rounds.map((round) => (
          <div key={round.id} className="rounded border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Text strong>{m.round(round.roundNo, round.versionNo)}</Text>
                <Tag color={m.roundColor[round.status]}>
                  {m.roundStatus[round.status]}
                </Tag>
                <Text type="secondary" className="text-xs">
                  {m.commentCount(round.comments.length)}
                  {round.openCount > 0 && ` · ${m.unanswered(round.openCount)}`}
                </Text>
              </div>
              {acting && round.status === "open" && (
                <Button
                  size="small"
                  disabled={busy || round.openCount > 0}
                  title={round.openCount > 0 ? m.closeBlocked : undefined}
                  onClick={() =>
                    void call(`contract-reviews/${round.id}/close`, {}, m.closed)
                  }
                >
                  {m.close}
                </Button>
              )}
            </div>
            <Text type="secondary" className="block text-xs">
              {m.openedBy(round.openedByName ?? "", at(round.openedAt))}
              {round.closedAt &&
                ` · ${m.closedBy(
                  round.closedByName ?? "",
                  at(round.closedAt),
                  round.closedVersionNo ?? round.versionNo,
                )}`}
            </Text>
            {round.note && (
              <Text className="block text-xs">{round.note}</Text>
            )}

            <div className="mt-2 divide-y">
              {round.comments.length ? (
                round.comments.map((comment) => commentRow(comment, round))
              ) : (
                <Text type="secondary" className="text-xs">
                  {m.noComments}
                </Text>
              )}
            </div>

            {acting && round.status === "open" && (
              <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                <Select
                  className="w-full"
                  aria-label={m.clause}
                  placeholder={m.clause}
                  value={clauseKey}
                  onChange={setClauseKey}
                  options={roundClauses.map((clause, index) => ({
                    value: clause.key,
                    label: `${index + 1}. ${clause.heading}`,
                  }))}
                />
                <Input.TextArea
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={4000}
                  aria-label={m.comment}
                  placeholder={m.commentPlaceholder}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <div>
                  <Button
                    disabled={busy || !clauseKey || !body.trim()}
                    onClick={async () => {
                      if (
                        await call(`contract-reviews/${round.id}/comments`, {
                          clause_key: clauseKey,
                          body,
                        })
                      ) {
                        setBody("");
                      }
                    }}
                  >
                    {m.addComment}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
