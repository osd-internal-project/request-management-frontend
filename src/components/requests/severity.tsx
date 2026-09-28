"use client";

import { Tag } from "antd";
import dayjs from "dayjs";
import type { RequestRow, RequestSeverity } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.severity;

const COLORS: Record<RequestSeverity, string> = {
  critical: "red",
  high: "orange",
  medium: "gold",
  low: "blue",
};

/** CD-67 — ระดับความรุนแรงของเคส; nothing for a request that is not a case. */
export function SeverityTag({
  severity,
}: {
  severity: RequestSeverity | null | undefined;
}) {
  if (!severity) return null;
  return <Tag color={COLORS[severity]}>{m.levels[severity]}</Tag>;
}

const when = (value: string) => dayjs(value).format("DD/MM/YY HH:mm");

/**
 * CD-67 — the response clock beside the resolution one: when someone must
 * answer by, then whether they did in time. Nothing for a non-case request.
 */
export function ResponseClock({
  row,
}: {
  row: { slaClock?: RequestRow["slaClock"] };
}) {
  const clock = row.slaClock;
  if (!clock?.responseDueAt) return null;

  if (clock.respondedAt) {
    return clock.responseBreachedAt ? (
      <Tag color="red">{m.respondedLate(when(clock.respondedAt))}</Tag>
    ) : (
      <Tag color="green">{m.respondedOnTime(when(clock.respondedAt))}</Tag>
    );
  }
  if (clock.responseBreachedAt) {
    return <Tag color="red">{m.responseOverdue}</Tag>;
  }
  return <Tag>{m.responseDue(when(clock.responseDueAt))}</Tag>;
}
