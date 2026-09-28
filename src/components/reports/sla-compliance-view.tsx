"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Segmented,
  Statistic,
  Table,
} from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import type {
  SlaComplianceReport,
  SlaComplianceRow,
  SlaGroupBy,
} from "@/lib/api/reports";
import type { RequestType } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { SearchSelect } from "@/components/ui/search-select";

const m = messages.slaReport;

/** Green from 90%, amber from 75%, red below — a glance, not a target. */
function tone(pct: number | null): string | undefined {
  if (pct === null) return undefined;
  if (pct >= 90) return "#389e0d";
  if (pct >= 75) return "#d48806";
  return "#cf1322";
}

const percent = (pct: number | null) => (pct === null ? m.none : `${pct}%`);

/**
 * CD-50 — filters in the URL (the server aggregates; nothing is narrowed
 * here), three headline figures, then one row per team / type / month with
 * the worst first.
 */
export function SlaComplianceView({
  report,
  types,
  filters,
}: {
  readonly report: SlaComplianceReport;
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
      next.size ? `${ROUTES.slaReport}?${next.toString()}` : ROUTES.slaReport,
    );
  }

  const totals = report.totals;
  const month = report.group_by === "month";
  const day = (iso: string) => dayjs(iso).format("DD/MM/YYYY");

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<SlaGroupBy>
            value={report.group_by}
            onChange={(value) =>
              apply("group_by", value === "team" ? undefined : value)
            }
            options={(["team", "type", "month"] as const).map((value) => ({
              value,
              label: m.groupBy[value],
            }))}
          />
          <SearchSelect
            allowClear
            style={{ width: 220 }}
            placeholder={m.filterType}
            value={filters.type_code}
            onChange={(value?: string) => apply("type_code", value)}
            options={types.map((type) => ({
              value: type.code,
              label: type.name,
            }))}
          />
          <DatePicker.RangePicker
            allowEmpty={[true, true]}
            value={[
              filters.from ? dayjs(filters.from) : null,
              filters.to ? dayjs(filters.to) : null,
            ]}
            onChange={(_, [from, to]) => {
              const next = new URLSearchParams(params.toString());
              for (const [key, value] of [
                ["from", from],
                ["to", to],
              ] as const) {
                if (value) next.set(key, value);
                else next.delete(key);
              }
              router.push(`${ROUTES.slaReport}?${next.toString()}`);
            }}
          />
          {(filters.type_code || filters.from || filters.to) && (
            <Button
              type="link"
              size="small"
              onClick={() => router.push(ROUTES.slaReport)}
            >
              {m.clearFilters}
            </Button>
          )}
        </div>
        <Text type="secondary" className="mt-2 block text-xs">
          {m.period(day(report.from), day(report.to))}
          {!filters.from && !filters.to && ` · ${m.defaultPeriod}`}
        </Text>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="small">
          <Statistic
            title={m.compliance}
            value={percent(totals.compliance_pct)}
            styles={{ content: { color: tone(totals.compliance_pct) } }}
          />
          <Text type="secondary" className="text-xs">
            {m.finishedOf(totals.on_time, totals.finished)}
          </Text>
        </Card>
        <Card size="small">
          <Statistic
            title={m.openOverdue}
            value={totals.open_overdue ?? 0}
            styles={{
              content: {
                color: totals.open_overdue ? "#cf1322" : undefined,
              },
            }}
          />
          <Text type="secondary" className="text-xs">
            {m.openOnTrack(totals.open_on_track ?? 0)}
          </Text>
        </Card>
        <Card size="small">
          <Statistic
            title={m.response}
            value={percent(totals.response_pct)}
            styles={{ content: { color: tone(totals.response_pct) } }}
          />
          <Text type="secondary" className="text-xs">
            {m.responseOf(totals.responses_on_time, totals.responses)}
          </Text>
        </Card>
      </div>

      <Card size="small">
        {report.rows.length ? (
          <Table<SlaComplianceRow>
            rowKey={(row) => row.key ?? "-"}
            size="small"
            dataSource={report.rows}
            pagination={false}
            scroll={{ x: true }}
            columns={[
              { title: m.groupBy[report.group_by], dataIndex: "label" },
              {
                title: m.columns.finished,
                dataIndex: "finished",
                align: "right",
              },
              { title: m.columns.onTime, dataIndex: "on_time", align: "right" },
              { title: m.columns.late, dataIndex: "late", align: "right" },
              {
                title: m.columns.compliance,
                dataIndex: "compliance_pct",
                align: "right",
                render: (value: number | null) => (
                  <Text strong style={{ color: tone(value) }}>
                    {percent(value)}
                  </Text>
                ),
              },
              ...(month
                ? []
                : [
                    {
                      title: m.columns.openOverdue,
                      dataIndex: "open_overdue",
                      align: "right" as const,
                      render: (value: number | null) =>
                        value ? (
                          <Text type="danger" strong>
                            {value}
                          </Text>
                        ) : (
                          (value ?? m.none)
                        ),
                    },
                    {
                      title: m.columns.openOnTrack,
                      dataIndex: "open_on_track",
                      align: "right" as const,
                    },
                    {
                      title: m.columns.response,
                      dataIndex: "response_pct",
                      align: "right" as const,
                      render: (value: number | null) => percent(value),
                    },
                  ]),
            ]}
          />
        ) : (
          <Empty description={m.empty} />
        )}
        <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
          {m.definitions}
        </Paragraph>
      </Card>
    </div>
  );
}
