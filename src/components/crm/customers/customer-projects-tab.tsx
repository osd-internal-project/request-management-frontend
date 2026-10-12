"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Empty, Skeleton, Table, Tag } from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import { HealthTag } from "@/components/pm/health-tag";
import { appApi } from "@/lib/api/client";
import type { ProjectHealth } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.customers.detail.projects;
const mp = messages.projects;

interface ProjectRow {
  id: string;
  projectNo: string;
  name: string;
  status: string;
  contractId: string;
  contractNo: string;
  managerName: string | null;
  startOn: string | null;
  endOn: string;
  contractValue: number | null;
  currency: string;
  health: ProjectHealth | null;
  intakeStatus: string | null;
}

const day = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";

/**
 * CD-68 — the customer's projects (PM), only those the viewer may see:
 * running ones first, the riskiest first, with health (CD-192) and whether
 * the work was received (CD-176). Loaded when the tab opens.
 */
export function CustomerProjectsTab({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void appApi<ProjectRow[]>(`projects/by-customer/${customerId}`).then(
      (result) => {
        if (result.ok) setRows(result.data);
        else setError(result.message);
      },
    );
  }, [customerId]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!rows) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (!rows.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />;
  }

  return (
    <Table<ProjectRow>
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={rows}
      scroll={{ x: true }}
      columns={[
        {
          title: m.project,
          key: "project",
          render: (_, row) => (
            <div>
              <Link href={ROUTES.projectDetail(row.id)}>{row.projectNo}</Link>
              <div className="text-xs">
                <Text type="secondary">{row.name}</Text>
              </div>
            </div>
          ),
        },
        {
          title: m.status,
          dataIndex: "status",
          render: (status: string) => (
            <Tag color={mp.statusColor[status]}>{mp.status[status]}</Tag>
          ),
        },
        {
          title: m.health,
          key: "health",
          render: (_, row) =>
            row.health ? <HealthTag health={row.health} /> : "—",
        },
        {
          title: m.intake,
          dataIndex: "intakeStatus",
          render: (status: string | null) =>
            status ? (
              <Tag color={m.intakeColor[status]}>{m.intakeStatus[status]}</Tag>
            ) : (
              "—"
            ),
        },
        { title: m.contract, dataIndex: "contractNo" },
        {
          title: m.period,
          key: "period",
          render: (_, row) => `${day(row.startOn)} – ${day(row.endOn)}`,
        },
        {
          title: m.value,
          dataIndex: "contractValue",
          align: "right",
          render: (value: number | null, row) =>
            value === null
              ? "—"
              : `${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ${row.currency}`,
        },
        {
          title: m.manager,
          dataIndex: "managerName",
          render: (name: string | null) => name ?? "—",
        },
      ]}
    />
  );
}
