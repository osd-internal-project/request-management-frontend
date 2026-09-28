"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import type { DecisionLogRow } from "@/lib/api/reports";
import { decisionLogQuery } from "@/lib/api/reports/decision-log-query";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.decisionLog;

/**
 * APV-06 (CD-45) — ตารางบันทึกการตัดสิน + ตัวกรอง + ปุ่มดาวน์โหลด CSV.
 * ตัวกรองอยู่ใน URL ทั้งหมด ลิงก์ดาวน์โหลดจึงได้ข้อมูลชุดเดียวกับที่เห็นบนจอ.
 */
export function DecisionLogView({
  rows,
  total,
  page,
  pageSize,
  period,
  basis,
}: {
  rows: DecisionLogRow[];
  total: number;
  page: number;
  pageSize: number;
  period: { from: string; to: string };
  basis?: string;
}) {
  const router = useRouter();

  function go(next: {
    from?: string;
    to?: string;
    basis?: string;
    page?: number;
  }) {
    const merged = {
      from: next.from ?? period.from,
      to: next.to ?? period.to,
      basis: "basis" in next ? next.basis : basis,
    };
    const params = new URLSearchParams(decisionLogQuery(merged));
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.decisionLog}?${params.toString()}`);
  }

  const exportHref = `/api/app/approvals/decisions/export?${decisionLogQuery({
    from: period.from,
    to: period.to,
    basis,
  })}`;

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Text type="secondary" className="text-xs">
              {m.period}
            </Text>
            <DatePicker.RangePicker
              allowClear={false}
              value={[dayjs(period.from), dayjs(period.to)]}
              onChange={(values) => {
                const range = values as [Dayjs, Dayjs] | null;
                if (range?.[0] && range[1]) {
                  go({
                    from: range[0].format("YYYY-MM-DD"),
                    to: range[1].format("YYYY-MM-DD"),
                  });
                }
              }}
            />
            <Text type="secondary" className="text-xs">
              {m.basis}
            </Text>
            <Select
              style={{ width: 200 }}
              value={basis ?? ""}
              onChange={(value: string) => go({ basis: value || undefined })}
              options={[
                { value: "", label: m.allBases },
                ...Object.entries(m.bases).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </Space>
          <Button icon={<DownloadOutlined />} href={exportHref}>
            {m.export}
          </Button>
        </div>
        <Text type="secondary" className="mt-2 block text-xs">
          {m.exportHint}
        </Text>
      </Card>

      <Card size="small">
        <Text type="secondary" className="mb-2 block text-xs">
          {m.periodLabel(period.from, period.to)}
        </Text>
        {rows.length ? (
          <Table<DecisionLogRow>
            rowKey="step_id"
            size="small"
            dataSource={rows}
            scroll={{ x: true }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              hideOnSinglePage: true,
              onChange: (next) => go({ page: next }),
            }}
            columns={[
              {
                title: m.columns.when,
                dataIndex: "decided_at",
                render: (value: string | null) =>
                  value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—",
              },
              {
                title: m.columns.request,
                dataIndex: "request_no",
                render: (value: string | null, row) =>
                  row.request_id ? (
                    <Link href={ROUTES.requestDetail(row.request_id)}>
                      {value ?? row.request_id}
                    </Link>
                  ) : (
                    row.subject_type
                  ),
              },
              {
                title: m.columns.amount,
                dataIndex: "amount",
                align: "right",
                render: (value: number | null, row) =>
                  value === null
                    ? "—"
                    : `${value.toLocaleString("th-TH")} ${row.currency ?? ""}`,
              },
              {
                title: m.columns.step,
                dataIndex: "step_no",
                render: (value: number, row) =>
                  `${value} · ${row.approver_role}`,
              },
              { title: m.columns.named, dataIndex: "approver_name" },
              { title: m.columns.decidedBy, dataIndex: "decided_by_name" },
              {
                title: m.columns.basis,
                dataIndex: "basis",
                render: (value: string) => (
                  <Tag color={m.basisColor[value]}>
                    {m.bases[value] ?? value}
                  </Tag>
                ),
              },
              {
                title: m.columns.decision,
                dataIndex: "decision",
                render: (value: string | null) =>
                  value ? (
                    <Tag color={m.decisionColor[value]}>
                      {m.decisions[value] ?? value}
                    </Tag>
                  ) : (
                    "—"
                  ),
              },
              { title: m.columns.note, dataIndex: "note" },
              {
                title: m.columns.data,
                key: "data",
                render: (_: unknown, row) => (
                  <Text type="secondary" className="text-xs">
                    {m.dataCell(
                      row.matrix_version,
                      row.snapshot_version,
                      row.snapshot_hash,
                    )}
                  </Text>
                ),
              },
            ]}
          />
        ) : (
          <Empty description={m.empty} />
        )}
        <Text type="secondary" className="mt-3 block text-xs">
          {m.basisNote}
        </Text>
      </Card>
    </div>
  );
}
