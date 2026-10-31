"use client";

import Link from "next/link";
import { Descriptions } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { ROUTES } from "@/lib/routes";

const URL_PATTERN = /^https?:\/\//i;

/** `intakeData` as the sender wrote it — no schema of ours, so keys show as sent. */
export function IntakeDataList({ data }: { data: Record<string, unknown> }) {
  return (
    <Descriptions size="small" column={1}>
      {Object.entries(data).map(([key, value]) => (
        <Descriptions.Item key={key} label={key}>
          <IntakeValue name={key} value={value} />
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

function IntakeValue({ name, value }: { name: string; value: unknown }) {
  if (name === "agent_record_id" && typeof value === "string") {
    return <Link href={ROUTES.agentRecordDetail(value)}>{value}</Link>;
  }
  if (typeof value === "string" && URL_PATTERN.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all"
      >
        {value} <ExportOutlined className="text-xs" />
      </a>
    );
  }
  if (typeof value === "object" && value !== null) {
    return <span className="break-all">{JSON.stringify(value)}</span>;
  }
  return <span className="whitespace-pre-wrap">{String(value)}</span>;
}
