"use client";

import type { ReactNode } from "react";
import { Empty, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { RequestEventRow } from "@/lib/api/types";
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

type Tone = "green" | "red" | "gold" | "blue";

/** Which way an event leans, from its type string. */
function toneOf(type: string): Tone {
  if (
    type.includes("reject") ||
    type.includes("return") ||
    type.includes("cancel") ||
    type.includes("held") ||
    type.includes("deny")
  ) {
    return "red";
  }
  if (
    type.includes("approve") ||
    type.includes("completed") ||
    type.includes("closed") ||
    type.includes("accepted")
  ) {
    return "green";
  }
  if (type.includes("review") || type.includes("routed")) return "gold";

  return "blue";
}

const DOT_STYLE: Record<Tone, string> = {
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-500",
  gold: "bg-amber-50 text-amber-500",
  blue: "bg-sky-50 text-sky-500",
};

const DOT_ICON: Record<Tone, ReactNode> = {
  green: <CheckCircleOutlined />,
  red: <CloseCircleOutlined />,
  gold: <ClockCircleOutlined />,
  blue: <SyncOutlined />,
};

/**
 * REQ-07 — what happened to this request, in order.
 *
 * Comments live next door in [[RequestComments]] now: an event is something
 * the system recorded, not something a person said, and the two read as
 * different kinds of fact once they are not interleaved in one list.
 *
 * Hand-rolled rather than antd's `Timeline`: that component sizes its own
 * dot and rail from a fixed 8px marker, so a custom icon dot (needed to tell
 * an approval from a bounce at a glance) threw the rail off-centre no matter
 * how the item's CSS variables were overridden. A three-column row — label,
 * dot-and-rail, card — gives the same picture with alignment that doesn't
 * fight the library.
 */
export function RequestTimeline({
  events,
}: {
  readonly events: RequestEventRow[];
}) {
  if (!events.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={messages.requestDetail.timelineEmpty}
      />
    );
  }

  return (
    <ol className="m-0 list-none p-0">
      {events.map((event, index) => {
        const actor =
          event.actorLabel === "system"
            ? messages.requestDetail.system
            : (event.actor?.displayName ?? messages.requestDetail.system);
        const label = messages.requestDetail.events[event.type] ?? event.type;
        // A v2 step event carries the step's name; without it every move read the same.
        const stepName =
          typeof event.data?.name === "string" ? event.data.name : null;
        const title =
          stepName && event.type.startsWith("request.step")
            ? messages.requestDetail.eventWithStep(label, stepName)
            : label;
        const fromStatus =
          event.fromStatus &&
          (messages.myWork.status[event.fromStatus] ?? event.fromStatus);
        const toStatus =
          event.toStatus &&
          (messages.myWork.status[event.toStatus] ?? event.toStatus);
        const tone = toneOf(event.type);
        const reason = reasonOf(event);
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className={`flex gap-3 ${isLast ? "" : "pb-4"}`}>
            <span className="w-20 shrink-0 pt-1 text-right text-xs whitespace-nowrap text-gray-500">
              {when(event.createdAt)}
            </span>

            <div className="flex flex-col items-center">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-sm ring-4 ring-white ${DOT_STYLE[tone]}`}
              >
                {DOT_ICON[tone]}
              </span>
              {!isLast && (
                <span className="-mb-4 mt-1 w-px flex-1 bg-slate-200" />
              )}
            </div>

            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Typography.Text strong className="text-sm text-gray-800">
                  {title}
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs">
                  {actor}
                </Typography.Text>
              </div>

              {(fromStatus || toStatus) && (
                <div className="mb-1 text-xs text-gray-500">
                  {fromStatus && toStatus ? (
                    <>
                      {fromStatus} → {toStatus}
                    </>
                  ) : (
                    (fromStatus ?? toStatus)
                  )}
                </div>
              )}

              {reason && (
                <div className="rounded-md border-l-2 border-slate-300 bg-white/70 px-2 py-1 text-sm leading-6 whitespace-pre-wrap text-gray-700">
                  {reason}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
