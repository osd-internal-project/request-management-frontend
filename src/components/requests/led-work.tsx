"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Checkbox, Empty, Input, Space, Table } from "antd";
import Text from "antd/es/typography/Text";
import type { RequestRow } from "@/lib/api/types";
import { requestColumns } from "@/components/requests/my-work";
import { SearchSelect } from "@/components/ui/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { Session } from "@/lib/session-shape";

/**
 * "งานทั้งหมด" — every request this person may open: their own, the groups they
 * head with subtrees, and the groups a scope grant reaches.
 *
 * Which rows those are is decided by `visibleRequestsWhere` in the backend, not
 * here — this screen is one caller of the rule, not a second copy of it.
 */
export function LedWork({
  rows,
  types,
  filters,
  leadsUnits,
  session,
}: {
  rows: RequestRow[];
  types: { code: string; name: string }[];
  filters: {
    status?: string;
    typeCode?: string;
    q?: string;
    overdue: boolean;
  };
  /** Whether the viewer heads any group — only used to explain an empty list. */
  leadsUnits: boolean;
  /** Gates the action buttons in each row — see `requestColumns`. */
  session: Session | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(filters.q ?? "");

  // One reading of the clock for the whole page, taken when it mounts.
  const [now] = useState(() => Date.now());

  /** Filters live in the URL, so the server applies them to the whole list. */
  function apply(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    router.push(
      next.size ? `${ROUTES.allWork}?${next.toString()}` : ROUTES.allWork,
    );
  }

  return (
    <Card>
      <Space wrap className="mb-3 flex">
        <Input.Search
          allowClear
          placeholder={messages.myWork.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => apply("q", value.trim() || undefined)}
          style={{ width: 260 }}
        />
        <SearchSelect
          allowClear
          value={filters.status}
          onChange={(value?: string) => apply("status", value)}
          placeholder={`${messages.myWork.filterStatus}: ${messages.myWork.filterAll}`}
          style={{ width: 170 }}
          options={Object.entries(messages.myWork.status).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <SearchSelect
          allowClear
          value={filters.typeCode}
          onChange={(value?: string) => apply("type_code", value)}
          placeholder={`${messages.myWork.filterType}: ${messages.myWork.filterAll}`}
          style={{ width: 190 }}
          options={types.map((type) => ({ value: type.code, label: type.name }))}
        />
        <Checkbox
          checked={filters.overdue}
          onChange={(event) =>
            apply("overdue", event.target.checked ? "true" : undefined)
          }
        >
          {messages.myWork.onlyOverdue}
        </Checkbox>
      </Space>

      {rows.length ? (
        <Table
          rowKey="id"
          size="small"
          dataSource={rows}
          columns={requestColumns(now, session)}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: true }}
          onRow={(row) => ({
            className: "cursor-pointer",
            onClick: () => router.push(ROUTES.requestDetail(row.id)),
          })}
        />
      ) : (
        /*
          An empty list has two very different causes, and they looked the same
          until 4 ก.ย. 2569: there is genuinely no work, or this person reaches
          no groups at all. Only the second needs an administrator.
        */
        <Empty
          description={
            <>
              <div>{messages.allWork.empty}</div>
              {!leadsUnits && (
                <Text type="secondary" className="mt-1 block text-xs">
                  {messages.allWork.emptyReason}
                </Text>
              )}
            </>
          }
        />
      )}
    </Card>
  );
}
