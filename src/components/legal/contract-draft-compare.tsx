"use client";

import { useState } from "react";
import { Card, Switch, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { DraftComparison } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";

const m = messages.contracts.review;

/**
 * CD-147 — two versions of a draft, clause by clause: added text
 * underlined in green, removed text struck through in red. Clauses that did
 * not change can be hidden.
 */
export function ContractDraftCompare({
  comparison,
}: {
  readonly comparison: DraftComparison;
}) {
  const [hideSame, setHideSame] = useState(true);
  const rows = hideSame
    ? comparison.clauses.filter((row) => row.change !== "same" || row.moved)
    : comparison.clauses;

  return (
    <Card
      size="small"
      title={m.compareTitle(comparison.from, comparison.to)}
      extra={
        <label className="flex items-center gap-2 text-xs">
          <Switch size="small" checked={hideSame} onChange={setHideSame} />
          {m.hideSame}
        </label>
      }
    >
      <Text className="mb-2 block text-sm">
        {m.compareCounts(
          comparison.counts.changed,
          comparison.counts.added,
          comparison.counts.removed,
        )}
      </Text>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.key} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Text strong delete={row.change === "removed"}>
                {row.heading}
              </Text>
              <Tag color={m.changeColor[row.change]}>{m.change[row.change]}</Tag>
              {row.moved && <Tag>{m.moved}</Tag>}
              {row.headingBefore && (
                <Text type="secondary" className="text-xs">
                  {m.headingBefore(row.headingBefore)}
                </Text>
              )}
            </div>
            <div className="mt-1 text-sm whitespace-pre-line">
              {row.diff.map((op, index) =>
                op.type === "same" ? (
                  <span key={index}>{op.text}</span>
                ) : op.type === "add" ? (
                  <ins
                    key={index}
                    className="bg-green-100 text-green-900 no-underline dark:bg-green-900/40 dark:text-green-100"
                  >
                    {op.text}
                  </ins>
                ) : (
                  <del
                    key={index}
                    className="bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
                  >
                    {op.text}
                  </del>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
