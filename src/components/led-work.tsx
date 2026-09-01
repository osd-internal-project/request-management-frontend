"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Checkbox, Empty, Input, Space, Table } from "antd";
import type { RequestRow } from "@/lib/api/types";
import { requestColumns } from "@/components/my-work";
import { SearchSelect } from "@/components/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

/**
 * "งานทั้งหมด" — the work of the groups this person heads, subtrees included.
 *
 * **Read-only, deliberately.** A head opening this screen is answering "what is
 * happening under me", not "what must I do next" — that is the four tabs on the
 * landing page. There are no action buttons here at all: a head who wants to
 * act on one of these rows opens the request, where the same rules apply to
 * them as to anybody else. Offering `รับเรื่อง` beside a ticket that is
 * somebody else's to accept would be a button that answers 403.
 *
 * Which rows those are is decided by `AccessService.ledUnitIdsOf`, not here —
 * this screen is one caller of the rule, not a second copy of it.
 */
export function LedWork({
  rows,
  types,
  filters,
}: {
  rows: RequestRow[];
  types: { code: string; name: string }[];
  filters: {
    status?: string;
    typeCode?: string;
    q?: string;
    overdue: boolean;
  };
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
          columns={requestColumns(now)}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: true }}
          onRow={(row) => ({
            className: "cursor-pointer",
            onClick: () => router.push(ROUTES.requestDetail(row.id)),
          })}
        />
      ) : (
        <Empty description={messages.allWork.empty} />
      )}
    </Card>
  );
}
