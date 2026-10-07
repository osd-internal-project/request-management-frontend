"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Card, Segmented, Select, Space, Table, Tag } from "antd";
import { appApi } from "@/lib/api/client";
import type { DisbursementRow } from "@/lib/api/disbursement";
import type { Paginated } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { baht, STATUS_COLOR, thaiDate } from "./format";

const m = messages.disbursement;

/** The work queues are filters on one list, not menus: each maps to statuses (or overdue). */
const PRESETS = {
  all: {},
  toPay: { status: "APPROVED,PARTIALLY_PAID" },
  toClear: { status: "PAID" },
  clearing: { status: "CLEARING" },
  closed: { status: "CLOSED" },
  overdue: { overdue: "true" },
} as const satisfies Record<string, Record<string, string>>;
type Preset = keyof typeof PRESETS;

const PRESET_LABELS: Record<Preset, string> = {
  all: m.filters.allStatuses,
  toPay: m.filters.toPay,
  toClear: m.filters.toClear,
  clearing: m.filters.clearing,
  closed: m.filters.closed,
  overdue: m.filters.overdue,
};

const isPreset = (value: string | null): value is Preset =>
  !!value && value in PRESETS;

/** การเบิก — one list; the queue, the kind and "mine" live in the URL so a link reopens the same view. */
export function DisbursementList({ canSeeAll }: { readonly canSeeAll: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const queue = search.get("queue");
  const preset: Preset = isPreset(queue) ? queue : "all";
  const kind = search.get("kind") ?? undefined;
  const scope: "mine" | "all" =
    !canSeeAll || search.get("scope") === "mine" ? "mine" : "all";

  const key = `${preset}|${kind ?? ""}|${scope}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: DisbursementRow[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ page_size: "100", scope, ...PRESETS[preset] });
    if (kind) params.set("kind", kind);
    void appApi<Paginated<DisbursementRow>>(`disbursements?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        setLoaded({
          key,
          rows: result.ok ? result.data.data : [],
          error: result.ok ? null : result.message,
        });
      },
    );
    return () => {
      live = false;
    };
  }, [key, preset, kind, scope]);

  function setParam(name: string, value: string | undefined) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const rows = loaded?.rows ?? [];

  return (
    <Card title={m.listTitle}>
      <Space direction="vertical" className="mb-4 w-full">
        <Segmented
          value={preset}
          onChange={(value) => setParam("queue", value === "all" ? undefined : String(value))}
          options={(Object.keys(PRESETS) as Preset[]).map((value) => ({
            value,
            label: PRESET_LABELS[value],
          }))}
        />
        <Space wrap>
          <Select
            allowClear
            placeholder={m.filters.allKinds}
            value={kind}
            onChange={(value?: string) => setParam("kind", value)}
            style={{ width: 180 }}
            options={Object.entries(m.kinds).map(([value, label]) => ({ value, label }))}
          />
          {canSeeAll && (
            <Segmented
              value={scope}
              onChange={(value) => setParam("scope", value === "mine" ? "mine" : undefined)}
              options={[
                { value: "all", label: m.filters.all },
                { value: "mine", label: m.filters.mine },
              ]}
            />
          )}
        </Space>
      </Space>
      {loaded?.error && <Alert type="error" showIcon title={loaded.error} />}
      <Table<DisbursementRow>
        rowKey="docNo"
        size="small"
        loading={loaded?.key !== key}
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 960 }}
        pagination={rows.length > 20 ? { pageSize: 20 } : false}
        columns={[
          {
            title: m.columns.docNo,
            dataIndex: "docNo",
            render: (docNo: string) => (
              <Link href={ROUTES.disbursementDetail(docNo)}>{docNo}</Link>
            ),
          },
          {
            title: m.columns.kind,
            dataIndex: "kind",
            render: (value: string) => m.kinds[value] ?? value,
          },
          { title: m.columns.requestNo, dataIndex: "requestNo" },
          { title: m.columns.purpose, dataIndex: "purpose", ellipsis: true },
          {
            title: m.columns.amount,
            dataIndex: "requestedAmount",
            align: "right",
            render: (value: string) => baht(value),
          },
          {
            title: m.columns.paid,
            dataIndex: "paidAmount",
            align: "right",
            render: (value: string) => baht(value),
          },
          {
            title: m.columns.clearBy,
            dataIndex: "clearBy",
            render: (value: string | null) => thaiDate(value),
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            render: (value: DisbursementRow["status"]) => (
              <Tag color={STATUS_COLOR[value]}>{m.statuses[value] ?? value}</Tag>
            ),
          },
        ]}
      />
    </Card>
  );
}
