"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, DatePicker, Space } from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import type { RequestType } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";
import { ROUTES } from "@/lib/routes";

/**
 * REQ-09's filters — by type and by period.
 *
 * `BottleneckQueryDto` has declared these since the report was written; the
 * page simply never sent them. They stay server-side parameters rather than
 * becoming client-side narrowing, because the rows arriving here are already
 * aggregated — filtering a mean after the fact would produce a number that is
 * an average of averages, which is not the same figure.
 *
 * `approver_user_id` is deliberately not offered yet: it needs a person picker
 * over the directory, and the type and period filters answer the question the
 * report is usually opened with.
 */
export function BottleneckFilters({
  types,
  filters,
}: {
  readonly types: RequestType[];
  readonly filters: { type_code?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function apply(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    router.push(
      next.size
        ? `${ROUTES.bottleneckReport}?${next.toString()}`
        : ROUTES.bottleneckReport,
    );
  }

  const hasFilters = Boolean(filters.type_code || filters.from || filters.to);

  return (
    <Card size="small">
      <Space wrap>
        <SearchSelect
          allowClear
          style={{ width: 220 }}
          placeholder={messages.bottleneck.filterType}
          value={filters.type_code}
          onChange={(value?: string) => apply("type_code", value)}
          options={types.map((type) => ({
            value: type.code,
            label: type.name,
          }))}
        />

        <span className="flex items-center gap-2">
          <Text type="secondary" className="text-xs">
            {messages.bottleneck.filterPeriod}
          </Text>
          {/* Seeded from the URL: a picker that forgets what is filtering the
              table reads as if the filter had been cleared. */}
          <DatePicker
            placeholder={messages.bottleneck.filterFrom}
            value={filters.from ? dayjs(filters.from) : null}
            onChange={(_, formatted) =>
              apply("from", (formatted as string) || undefined)
            }
          />
          <DatePicker
            placeholder={messages.bottleneck.filterTo}
            value={filters.to ? dayjs(filters.to) : null}
            onChange={(_, formatted) =>
              apply("to", (formatted as string) || undefined)
            }
          />
        </span>

        {hasFilters && (
          <Button
            type="link"
            size="small"
            onClick={() => router.push(ROUTES.bottleneckReport)}
          >
            {messages.bottleneck.clearFilters}
          </Button>
        )}
      </Space>
    </Card>
  );
}
