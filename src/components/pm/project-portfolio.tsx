"use client";

import Link from "next/link";
import { Card, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type { PortfolioRow, PortfolioView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { HealthTag } from "./health-tag";

const m = messages.projects.portfolio;

/**
 * CD-192 — the executives' view: every running project, red first, then by
 * score, with what puts each at risk and whether this week's report is in.
 */
export function ProjectPortfolio({ view }: { readonly view: PortfolioView }) {
  const columns: ColumnsType<PortfolioRow> = [
    {
      title: m.columns.project,
      key: "project",
      render: (_, row) => (
        <Link href={ROUTES.projectDetail(row.id)}>
          {row.projectNo} · {row.name}
        </Link>
      ),
    },
    {
      title: m.columns.customer,
      dataIndex: "customerName",
      responsive: ["md"],
    },
    {
      title: m.columns.manager,
      dataIndex: "managerName",
      responsive: ["lg"],
    },
    {
      title: m.columns.health,
      key: "health",
      render: (_, row) => <HealthTag health={row.health} />,
    },
    {
      title: m.columns.factors,
      key: "factors",
      responsive: ["md"],
      render: (_, row) =>
        row.health.factors.map((factor) => (
          <div key={factor.key} className="text-xs">
            {factor.label}: {factor.detail}
          </div>
        )),
    },
    {
      title: m.columns.progress,
      key: "progress",
      responsive: ["lg"],
      render: (_, row) =>
        `${row.progress.workPct ?? "—"}% / ${row.progress.plannedPct ?? "—"}%`,
    },
    {
      title: m.columns.endOn,
      dataIndex: "endOn",
      responsive: ["lg"],
      render: (value: string) => dayjs(value).format("D MMM YY"),
    },
    {
      title: m.columns.report,
      key: "report",
      render: (_, row) => (
        <Tag
          color={
            row.reportStatus === "submitted"
              ? "success"
              : row.reportStatus === "draft"
                ? "default"
                : "red"
          }
        >
          {m.report[row.reportStatus ?? "none"]}
        </Tag>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">
          {m.subtitle(
            dayjs(view.thisWeek).format("D MMM YY"),
            view.thresholds.amber,
            view.thresholds.red,
          )}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="small">
          <Statistic
            title={m.counts.red}
            value={view.counts.red}
            valueStyle={{ color: "#cf1322" }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title={m.counts.amber}
            value={view.counts.amber}
            valueStyle={{ color: "#d48806" }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title={m.counts.green}
            value={view.counts.green}
            valueStyle={{ color: "#389e0d" }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title={m.counts.unreported}
            value={view.counts.unreported}
          />
        </Card>
      </div>
      <Table<PortfolioRow>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={view.projects}
        pagination={false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: true }}
      />
    </div>
  );
}
