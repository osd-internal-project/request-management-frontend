"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Empty, Input } from "antd";
import Text from "antd/es/typography/Text";
import { addComment } from "@/lib/api/client-requests";
import type { RequestComment, RequestEventRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** Thai date + time as §16 prints it: `23 ส.ค. 16:40 น.` */
function when(iso: string): string {
  const at = new Date(iso);

  return `${at.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  })} ${at.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })} น.`;
}

/**
 * The reason attached to a transition.
 *
 * Every backward move already stored one — a return reason, a hold reason, a
 * cancel reason, an approver's remark — in `RequestEvent.data`, and the
 * timeline read `type`, actor and status and stopped there. So the system knew
 * why a request had bounced and the screen would not say.
 */
function reasonOf(event: RequestEventRow): string | null {
  const data = event.data ?? {};
  const value = data.note ?? data.reason;

  return typeof value === "string" && value.trim() ? value : null;
}

type Entry =
  | { kind: "event"; at: string; event: RequestEventRow }
  | { kind: "comment"; at: string; comment: RequestComment };

/**
 * REQ-07 + H2.2 — what happened to this request, and what people said about it.
 *
 * One list, in time order. They are different tables and different kinds of
 * fact — an event is something the system recorded, a comment is something a
 * person chose to say — but the people on a request read them as one thread,
 * and splitting them into two boxes makes the reader interleave by timestamp
 * in their head.
 */
export function RequestTimeline({
  requestId,
  events,
  comments,
  canComment,
}: {
  readonly requestId: string;
  readonly events: RequestEventRow[];
  readonly comments: RequestComment[];
  /** False for somebody reading a request they are not involved in. */
  readonly canComment: boolean;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const entries: Entry[] = [
    ...events.map((event) => ({
      kind: "event" as const,
      at: event.createdAt,
      event,
    })),
    ...comments.map((comment) => ({
      kind: "comment" as const,
      at: comment.createdAt,
      comment,
    })),
  ].sort((left, right) => left.at.localeCompare(right.at));

  async function send() {
    const body = draft.trim();
    if (!body) return;

    setBusy(true);
    const result = await addComment(requestId, body);
    setBusy(false);

    if (!result.ok) {
      void message.error(result.message);
      return;
    }

    setDraft("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {entries.length ? (
        <ol className="space-y-3">
          {entries.map((entry) =>
            entry.kind === "comment" ? (
              <li key={`c-${entry.comment.id}`} className="text-sm">
                <div>
                  <Text strong>
                    {entry.comment.author?.displayName ??
                      messages.requestDetail.system}
                  </Text>{" "}
                  <Text type="secondary">· {when(entry.at)}</Text>
                </div>
                <div className="whitespace-pre-wrap">{entry.comment.body}</div>
              </li>
            ) : (
              <li key={`e-${entry.event.id}`} className="text-sm">
                <div>
                  <Text strong>
                    {messages.requestDetail.events[entry.event.type] ??
                      entry.event.type}
                  </Text>{" "}
                  <Text type="secondary">
                    —{" "}
                    {entry.event.actorLabel === "system"
                      ? messages.requestDetail.system
                      : (entry.event.actor?.displayName ??
                        messages.requestDetail.system)}{" "}
                    · {when(entry.at)}
                  </Text>
                </div>

                {entry.event.fromStatus && entry.event.toStatus && (
                  <Text type="secondary" className="text-xs">
                    {messages.myWork.status[entry.event.fromStatus] ??
                      entry.event.fromStatus}{" "}
                    →{" "}
                    {messages.myWork.status[entry.event.toStatus] ??
                      entry.event.toStatus}
                  </Text>
                )}

                {reasonOf(entry.event) && (
                  <div className="mt-0.5 border-l-2 border-black/10 pl-2 whitespace-pre-wrap">
                    {reasonOf(entry.event)}
                  </div>
                )}
              </li>
            ),
          )}
        </ol>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={messages.requestDetail.commentEmpty}
        />
      )}

      {canComment && (
        <div className="flex gap-2">
          <Input.TextArea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={messages.requestDetail.commentPlaceholder}
          />
          <Button
            type="primary"
            loading={busy}
            disabled={!draft.trim()}
            onClick={() => void send()}
          >
            {messages.requestDetail.commentSend}
          </Button>
        </div>
      )}
    </div>
  );
}
