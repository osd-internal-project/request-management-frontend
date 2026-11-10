"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Modal, Spin, Typography } from "antd";
import { ExpandOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type { AgentRecordRow } from "@/lib/api/agent-records";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { useAgentRecordStream } from "@/components/agent-records/use-agent-record-stream";

const { Text } = Typography;
const mf = messages.sales.leads.focus;

/**
 * การ์ด Research Lead — สั่งงาน `lead.research` แล้วแสดง `intakeData.research`
 * ที่ Vuvagent merge เข้ามาเอง, เป็น JSON ตามที่ส่งมา (ไม่มี schema ฝั่งเรา).
 */
export function LeadFocusCard({
  leadId,
  research,
  running: runningRows,
  canStart,
}: {
  leadId: string;
  research: unknown;
  running: AgentRecordRow[];
  canStart: boolean;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [recordId, setRecordId] = useState<string | null>(
    () => runningRows.find((row) => row.action === "lead.research")?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useAgentRecordStream(recordId ? [recordId] : [], (stamp) => {
    if (stamp.status === "processing") return;
    setRecordId(null);
    if (stamp.status === "failed") setError(mf.failed);
    router.refresh();
  });

  async function start() {
    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string; status: string; error?: string }>(
      `leads/${leadId}/research`,
      { method: "POST", body: JSON.stringify({ focus: focus.trim() }) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.data.status === "failed") {
      setError(result.data.error ?? mf.failed);
      return;
    }
    setRecordId(result.data.id);
  }

  const running = recordId !== null;
  const text =
    research === undefined || research === null
      ? null
      : JSON.stringify(research, null, 2);

  return (
    <Card
      size="small"
      title={mf.title}
      className="border-[#adc6ff]! bg-[#f0f5ff]!"
      extra={
        canStart && (
          <Button
            size="small"
            type="primary"
            loading={busy}
            disabled={running}
            onClick={() => void start()}
          >
            {mf.run}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-2">
        {canStart && (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={500}
            placeholder={mf.focusPlaceholder}
            aria-label={mf.focusPlaceholder}
            value={focus}
            disabled={running}
            onChange={(e) => setFocus(e.target.value)}
          />
        )}
        {error && <Alert type="error" showIcon title={error} />}
        {running && (
          <div className="flex items-center gap-2">
            <Spin size="small" />
            <Text type="secondary">{mf.running}</Text>
            <Link href={ROUTES.agentRecordDetail(recordId)}>{mf.viewJob}</Link>
          </div>
        )}
        {text !== null ? (
          <div className="flex flex-col items-end gap-1">
            <Input.TextArea
              readOnly
              rows={5}
              value={text}
              aria-label={mf.title}
              className="font-mono text-xs"
            />
            <Button
              size="small"
              type="text"
              icon={<ExpandOutlined />}
              aria-label={mf.expand}
              title={mf.expand}
              onClick={() => setExpanded(true)}
            />
          </div>
        ) : (
          !running && <Text type="secondary">{mf.empty}</Text>
        )}
      </div>

      <Modal
        open={expanded}
        title={mf.title}
        width={800}
        footer={null}
        onCancel={() => setExpanded(false)}
        destroyOnHidden
      >
        <Input.TextArea
          readOnly
          autoSize={{ minRows: 10, maxRows: 30 }}
          value={text ?? ""}
          aria-label={mf.title}
          className="font-mono text-xs"
        />
      </Modal>
    </Card>
  );
}
