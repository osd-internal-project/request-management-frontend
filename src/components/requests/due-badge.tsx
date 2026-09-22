"use client";

import { useState } from "react";
import { Tag } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";

/**
 * Only what the badge reads.
 *
 * Structural rather than `RequestRow`, so the list row and the richer detail
 * payload — whose `requester` is a different shape — can both be passed
 * without one of them being widened to satisfy a component that never looks
 * at that field.
 */
export interface Deadline {
  dueAt: string | null;
  slaClock?: { state: string } | null;
}

/** "3 ชม." / "2 วัน" — the granularity the mockup shows. */
export function humanGap(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(Math.floor(ms / 60_000), 1)} นาที`;
  if (hours < 24) return `${hours} ชม.`;
  return `${Math.floor(hours / 24)} วัน`;
}

/**
 * The `ครบกำหนด` badge (§16 หน้าที่ 2 column, หน้าที่ 4 header).
 *
 * Three states, because that is what the clock actually has: stopped while the
 * request sits with its requester, past due, or counting down. Showing a
 * deadline for a paused clock would be a lie — the time is not running.
 *
 * `now` is passed in rather than read here: reading the clock during render
 * makes the same row render differently on an incidental re-render, so the
 * page takes one reading and every row is measured against it.
 *
 * Its own module, and free of hooks, so the server-rendered detail page can
 * import it without pulling in the list's table, tabs and filters. Two screens
 * showing the same deadline had to compute it the same way: a second copy is
 * how a row and the page it links to start disagreeing, which is precisely
 * what SCOPE-02 forbids.
 */
export function DueCell({ row, now }: { row: Deadline; now: number }) {
  const state = row.slaClock?.state;

  if (state === "paused") {
    return <Tag>{messages.myWork.clockPaused}</Tag>;
  }

  /**
   * A stopped clock has already been judged — read its verdict rather than
   * recompute one.
   *
   * `met` means the work finished inside its SLA, and the clock does not run
   * while a request sits returned with its requester (SUP-01). Comparing
   * `dueAt` to the wall clock ignores that pause, so a request the system
   * recorded as on time would keep counting up and eventually read
   * `เกินกำหนด` — contradicting the row the decision was written to.
   */
  if (state === "met") {
    return <Tag color="green">{messages.myWork.onTime}</Tag>;
  }

  if (state === "cancelled") return <Text type="secondary">—</Text>;

  if (!row.dueAt) return <Text type="secondary">—</Text>;

  const gap = new Date(row.dueAt).getTime() - now;

  return gap < 0 ? (
    <Tag color="red">{messages.myWork.overdueBy(humanGap(-gap))}</Tag>
  ) : (
    <Tag color="green">{messages.myWork.dueIn(humanGap(gap))}</Tag>
  );
}

/**
 * The same badge, timing itself — for the single-badge case.
 *
 * The list hands every row one reading so a table cannot disagree with itself;
 * a detail page shows exactly one deadline, so there is nothing to keep in
 * step and no reason to make a server component read the clock. `useState`
 * with a lazy initialiser, like both list screens, so the reading happens once
 * on mount rather than on every render.
 */
export function DueBadge({ row }: { row: Deadline }) {
  const [now] = useState(() => Date.now());

  return <DueCell row={row} now={now} />;
}
