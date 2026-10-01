"use client";

import Text from "antd/es/typography/Text";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import type { DealMargin } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.sales.quotations.dealMargin;

/**
 * CD-199 — "Margin ของดีล" over the latest standing version of each of the
 * deal's quotations, red under the company minimum. Only rendered when the
 * API sent the cost (SCOPE-04 masks it otherwise).
 */
export function DealMarginLine({ margin }: { margin: DealMargin }) {
  const pct =
    margin.marginPct === null || margin.marginPct === undefined
      ? null
      : Number(margin.marginPct);
  const low = pct === null || pct < margin.minMarginPct;
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded bg-gray-50 px-3 py-2 text-sm">
      <Text strong>{m.title}</Text>
      <Text type={low ? "danger" : undefined} strong>
        {formatAmount(margin.marginAmount ?? null)} {margin.currency} ·{" "}
        {pct === null ? "—" : `${pct.toFixed(2)}%`}
      </Text>
      <Text type="secondary" className="text-xs">
        {m.basis(
          margin.quotations.length,
          formatAmount(margin.netTotal),
          formatAmount(margin.costTotal ?? null),
          margin.currency,
        )}
      </Text>
      {low && (
        <Text type="danger" className="text-xs">
          {m.belowMin(margin.minMarginPct)}
        </Text>
      )}
    </div>
  );
}
