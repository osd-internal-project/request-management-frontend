"use client";

import { Tag, Timeline } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type {
  HandoverCategory,
  HandoverHistoryEntry,
  HandoverItem,
  SalesHandoverStatus,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.handover;

export const CATEGORY_ORDER: readonly HandoverCategory[] = [
  "commercial",
  "requirement",
  "commitment",
];

/** Lines in their group order, each group in the list's own order. */
export function groupItems<T extends { category: HandoverCategory }>(
  items: readonly T[],
): { category: HandoverCategory; items: T[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export function HandoverStatusTag({ status }: { status: SalesHandoverStatus }) {
  return <Tag color={m.statusColor[status]}>{m.status[status] ?? status}</Tag>;
}

export function formatWhen(at: string | null): string {
  return at ? dayjs(at).format("D MMM YYYY HH:mm") : "—";
}

/** The checklist as it was sent — what the receiving team reads. */
export function HandoverChecklistView({ items }: { items: HandoverItem[] }) {
  return (
    <div className="space-y-3">
      {groupItems(items).map((group) => (
        <div key={group.category}>
          <Text strong className="text-sm">
            {m.categories[group.category]}
          </Text>
          <ul className="mt-1 space-y-1 pl-0">
            {group.items.map((item) => (
              <li key={item.code} className="list-none text-sm">
                <span
                  className={item.checked ? "text-green-600" : "text-red-500"}
                >
                  {item.checked ? "✓" : "✗"}
                </span>{" "}
                {item.label}
                {item.detail && (
                  <div className="ml-5 whitespace-pre-wrap text-gray-600">
                    {item.detail}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function HandoverHistory({
  entries,
}: {
  entries: HandoverHistoryEntry[];
}) {
  if (!entries.length) return null;
  return (
    <Timeline
      items={[...entries].reverse().map((entry) => ({
        color:
          entry.action === "accepted"
            ? "green"
            : entry.action === "returned"
              ? "orange"
              : "blue",
        content: (
          <div className="text-xs">
            <div>
              {m.historyAction[entry.action]} · {entry.byName} ·{" "}
              {formatWhen(entry.at)}
            </div>
            {entry.reason && <Text type="secondary">{entry.reason}</Text>}
          </div>
        ),
      }))}
    />
  );
}
