"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Card, Descriptions, Space, Spin, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CodeBlock } from "@/components/ui/code-block";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { AgentRecordDetail } from "@/lib/api/agent-records";
import { formatDateTime, formatElapsed } from "./format";
import { useAgentRecordStream } from "./use-agent-record-stream";

const m = messages.agentRecords;
/** Past this the page says so; Vuvagent has no timeout we can read. */
const SLOW_MS = 10 * 60_000;

/** หนึ่งงานของ agent — สถานะเปลี่ยนเองผ่าน SSE แล้ว server page อ่านผลใหม่. */
export function AgentRecordView({ record }: { record: AgentRecordDetail }) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const processing = record.status === "processing";
  const now = useNow(processing);

  useAgentRecordStream(processing ? [record.id] : [], refresh);

  const slow =
    processing && now - new Date(record.createdAt).getTime() > SLOW_MS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={ROUTES.agentRecords}>{m.back}</Link>
        {record.action === "lead.find" && (
          <Link href={ROUTES.leads}>
            <Button size="small">{m.goToLeads}</Button>
          </Link>
        )}
      </div>

      <div>
        <Space wrap align="center">
          <Title level={4} className="mb-0!">
            {record.input.topic ?? m.action[record.action] ?? record.action}
          </Title>
          <Tag color={m.statusColor[record.status]}>
            {m.status[record.status]}
          </Tag>
          {record.timedOutAt && <Tag>{m.timedOut}</Tag>}
        </Space>
        <Text type="secondary" className="block text-xs">
          {m.action[record.action] ?? record.action} ·{" "}
          {m.startedBy(
            record.createdByName ?? "-",
            formatDateTime(record.createdAt),
          )}
        </Text>
      </div>

      {processing && (
        <Space align="center">
          <Spin size="small" />
          <Text>{m.working}</Text>
          <Text type="secondary">
            {m.elapsed(formatElapsed(record.createdAt, now))}
          </Text>
        </Space>
      )}
      {slow && <Alert type="warning" showIcon title={m.slow} />}
      {record.status === "failed" && (
        <Alert
          type="error"
          showIcon
          title={m.failed}
          description={record.error ?? m.failedNoReason}
        />
      )}

      <div className="space-y-1">
        <Title level={5} className="mb-0!">
          {m.payloadTitle}
        </Title>
        <Text type="secondary" className="block text-xs">
          {m.payloadHint(record.action)}
        </Text>
        <CodeBlock
          code={JSON.stringify(
            { agent_record_id: record.id, ...record.input },
            null,
            2,
          )}
        />
      </div>

      {record.result && (
        <Card size="small" title={m.resultTitle}>
          <Descriptions size="small" column={{ xs: 1, md: 2 }}>
            {Object.entries(record.result).map(([key, value]) => (
              <Descriptions.Item key={key} label={m.resultLabels[key] ?? key}>
                {typeof value === "object" && value !== null
                  ? JSON.stringify(value)
                  : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </div>
  );
}

/** The clock, ticking each second only while something is running. */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}
