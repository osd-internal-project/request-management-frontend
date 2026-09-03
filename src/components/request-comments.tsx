"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input, Typography } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { addComment } from "@/lib/api/client-requests";
import type { RequestComment } from "@/lib/api/types";
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

/** First glyph of the author's name, for the bubble's avatar. */
function initialOf(name: string): string {
  return [...name.trim()][0] ?? "?";
}

/**
 * H2.2 — what people said about a request.
 *
 * Split out of the timeline: an event is something the system recorded and a
 * comment is something a person chose to say, and merging them made the reader
 * scan past routing noise to follow a conversation. The two now sit in
 * neighbouring cards, comments first, because the conversation is what a
 * reader comes back to a request for.
 */
export function RequestComments({
  requestId,
  comments,
  canComment,
}: {
  readonly requestId: string;
  readonly comments: RequestComment[];
  /** False for somebody reading a request they are not involved in. */
  readonly canComment: boolean;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

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

  // Newest last, so the thread reads downwards like every other chat.
  const thread = [...comments].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );

  return (
    <div className="space-y-3">
      {canComment ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 transition-colors duration-200 focus-within:border-violet-300 focus-within:bg-white mb-2">
          <Input.TextArea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={messages.requestDetail.commentPlaceholder}
            // Ctrl/⌘+Enter sends: the thread is a chat, and reaching for the
            // mouse after every line is what makes one feel slow.
            onPressEnter={(event) => {
              if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                void send();
              }
            }}
            className="resize-none border-0! bg-transparent! shadow-none!"
          />
          <div className="flex justify-end">
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              loading={busy}
              disabled={!draft.trim()}
              onClick={() => void send()}
            >
              {messages.requestDetail.commentSend}
            </Button>
          </div>
        </div>
      ) : (
        <Typography.Text type="secondary" className="block text-xs">
          {messages.requestDetail.commentReadOnly}
        </Typography.Text>
      )}
      {thread.length ? (
        <ul className="m-0 max-h-80 list-none space-y-2 overflow-y-auto p-0 pr-1">
          {thread.map((comment) => {
            const author =
              comment.author?.displayName ?? messages.requestDetail.system;

            return (
              <li
                key={comment.id}
                className="flex gap-2 transition-colors duration-200"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700"
                >
                  {initialOf(author)}
                </span>
                <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-slate-200/80 bg-white px-3 py-2 transition-shadow duration-200 hover:shadow-sm">
                  <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-x-2">
                    <Typography.Text strong className="text-sm text-gray-800">
                      {author}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="text-xs">
                      {when(comment.createdAt)}
                    </Typography.Text>
                  </div>
                  <div className="text-sm leading-6 break-words whitespace-pre-wrap text-gray-700">
                    {comment.body}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Typography.Text type="secondary" className="block py-2 text-sm">
          {messages.requestDetail.commentEmpty}
        </Typography.Text>
      )}
    </div>
  );
}
