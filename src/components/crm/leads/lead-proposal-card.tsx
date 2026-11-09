"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Spin, Typography } from "antd";
import { appApi } from "@/lib/api/client";
import type { AgentRecordDetail } from "@/lib/api/agent-records";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { useAgentRecordStream } from "@/components/agent-records/use-agent-record-stream";

const { Text } = Typography;
const mp = messages.sales.leads.proposal;
/** Vuvagent's download link stops working 7 days after it is made. */
const LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

interface Suggestion {
  product: string;
  reason: string;
}

type Job =
  | { kind: "suggest"; recordId: string }
  | { kind: "write"; recordId: string; product: string };

/** `intakeData.product_suggestions` is written by the agent; keep only well-formed rows. */
function suggestionsOf(value: unknown): Suggestion[] {
  if (typeof value !== "object" || value === null) return [];
  const products: unknown = (value as { products?: unknown }).products;
  if (!Array.isArray(products)) return [];
  return products.flatMap((row: unknown) => {
    if (typeof row !== "object" || row === null) return [];
    const { product, reason } = row as { product?: unknown; reason?: unknown };
    return typeof product === "string"
      ? [{ product, reason: typeof reason === "string" ? reason : "" }]
      : [];
  });
}

/**
 * การ์ด Proposal — Proposal Writer ของ Vuvagent สองขั้น: `lead.suggest_products`
 * แล้ว `lead.write_proposal` ของสินค้าที่ sale เลือก. ไฟล์ที่ได้ขึ้นที่การ์ดไฟล์
 * (kind=proposal); ที่นี่แสดงแค่ลิงก์สำรองเมื่อ CTD เก็บไฟล์ไม่สำเร็จ.
 */
export function LeadProposalCard({
  leadId,
  suggestions: raw,
  canStart,
}: {
  leadId: string;
  suggestions: unknown;
  canStart: boolean;
}) {
  const router = useRouter();
  const suggestions = suggestionsOf(raw);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<{
    url: string;
    expires: Date;
  } | null>(null);

  async function checkStored(recordId: string) {
    const record = await appApi<AgentRecordDetail>(`agent-records/${recordId}`);
    if (!record.ok) return;
    const { proposal_url: url, proposal_file_error: problem } =
      record.data.result ?? {};
    if (typeof problem === "string" && typeof url === "string") {
      setFallback({
        url,
        expires: new Date(
          new Date(record.data.updatedAt).getTime() + LINK_LIFETIME_MS,
        ),
      });
    }
  }

  useAgentRecordStream(job ? [job.recordId] : [], (stamp) => {
    if (stamp.status === "processing" || !job) return;
    setJob(null);
    if (stamp.status === "failed") {
      setError(job.kind === "suggest" ? mp.suggestFailed : mp.writeFailed);
    } else if (job.kind === "write") {
      void checkStored(job.recordId);
    }
    router.refresh();
  });

  async function start(path: string, body: object, next: (id: string) => Job) {
    setBusy(true);
    setError(null);
    setFallback(null);
    const result = await appApi<{ id: string; status: string; error?: string }>(
      `leads/${leadId}/${path}`,
      { method: "POST", body: JSON.stringify(body) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.data.status === "failed") {
      setError(result.data.error ?? mp.suggestFailed);
      return;
    }
    setJob(next(result.data.id));
  }

  const running = job !== null;

  return (
    <Card
      size="small"
      title={mp.title}
      className="border-[#adc6ff]! bg-[#f0f5ff]!"
      extra={
        canStart && (
          <Button
            size="small"
            type="primary"
            loading={busy && !running}
            disabled={running}
            onClick={() =>
              void start("suggest-products", {}, (recordId) => ({
                kind: "suggest",
                recordId,
              }))
            }
          >
            {mp.suggest}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-2">
        {suggestions.map((row) => (
          <div key={row.product} className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <Text strong>{row.product}</Text>
              {row.reason && (
                <Text type="secondary" className="text-xs">
                  {row.reason}
                </Text>
              )}
            </div>
            {canStart && (
              <Button
                size="small"
                disabled={running || busy}
                onClick={() =>
                  void start(
                    "proposal",
                    { product: row.product },
                    (recordId) => ({
                      kind: "write",
                      recordId,
                      product: row.product,
                    }),
                  )
                }
              >
                {mp.write}
              </Button>
            )}
          </div>
        ))}
        {error && <Alert type="error" showIcon title={error} />}
        {fallback && (
          <Alert
            type="warning"
            showIcon
            title={mp.notStored(fallback.expires.toLocaleDateString("th-TH"))}
            description={
              <a href={fallback.url} target="_blank" rel="noreferrer">
                {mp.download}
              </a>
            }
          />
        )}
        {job && (
          <div className="flex items-center gap-2">
            <Spin size="small" />
            <Text type="secondary">
              {job.kind === "suggest"
                ? mp.suggesting
                : mp.writing(job.product)}
            </Text>
            <Link href={ROUTES.agentRecordDetail(job.recordId)}>
              {mp.viewJob}
            </Link>
          </div>
        )}
        {suggestions.length === 0 && !running && (
          <Text type="secondary">{mp.empty}</Text>
        )}
      </div>
    </Card>
  );
}
