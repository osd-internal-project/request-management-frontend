"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Collapse, Input, Spin, Typography } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { useAgentRecordStream } from "@/components/agent-records/use-agent-record-stream";
import { IntakeDataList } from "./intake-data-list";

const { Text, Paragraph } = Typography;
const mf = messages.sales.leads.focus;

/**
 * การ์ด Focus — สั่งงาน `lead.research` แล้วแสดง `lead.data` ที่ Vuvagent เขียนเอง.
 * `data` ไม่มี schema ฝั่งเรา: อ่านเฉพาะ key ที่รู้จัก ส่วนที่เหลือแสดงตามที่ส่งมา.
 */
export function LeadFocusCard({
  leadId,
  data,
  canStart,
}: {
  leadId: string;
  data: Record<string, unknown> | null;
  canStart: boolean;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {data ? mf.rerun : mf.run}
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
        {data ? (
          <ResearchView data={data} />
        ) : (
          !running && <Text type="secondary">{mf.empty}</Text>
        )}
      </div>
    </Card>
  );
}

const KNOWN = new Set([
  "summary",
  "business",
  "product_fit",
  "cs_pain_points",
  "recent_signals",
  "decision_makers",
  "customer_channels",
  "sources",
]);

function ResearchView({ data }: { data: Record<string, unknown> }) {
  const fit = record(data.product_fit);
  const score = typeof fit?.fit_score === "number" ? fit.fit_score : null;
  const products = rows(fit?.products);
  const talking = strings(fit?.talking_points);
  const pains = rows(data.cs_pain_points);
  const signals = rows(data.recent_signals);
  const people = rows(data.decision_makers);
  const channels = strings(data.customer_channels);
  const sources = strings(data.sources);
  const rest = Object.fromEntries(
    Object.entries(data).filter(([key]) => !KNOWN.has(key)),
  );

  const sections = [
    {
      key: "products",
      label: mf.sections.products,
      size: products.length,
      body: products.map((p, i) => (
        <li key={i}>
          <Text strong>{text(p.product)}</Text>
          <Paragraph type="secondary" className="mb-0! text-xs">
            {text(p.why)}
          </Paragraph>
        </li>
      )),
    },
    {
      key: "talking",
      label: mf.sections.talking,
      size: talking.length,
      body: talking.map((t, i) => <li key={i}>{t}</li>),
    },
    {
      key: "pains",
      label: mf.sections.pains,
      size: pains.length,
      body: pains.map((p, i) => (
        <li key={i}>
          {text(p.point)} <SourceLink url={p.evidence_url} />
        </li>
      )),
    },
    {
      key: "signals",
      label: mf.sections.signals,
      size: signals.length,
      body: signals.map((s, i) => (
        <li key={i}>
          <Text type="secondary" className="text-xs">
            {text(s.date)}
          </Text>
          <div>
            {text(s.signal)} <SourceLink url={s.url} />
          </div>
        </li>
      )),
    },
    {
      key: "people",
      label: mf.sections.people,
      size: people.length,
      body: people.map((p, i) => (
        <li key={i}>
          <Text strong>{text(p.name)}</Text> <SourceLink url={p.url} />
          <div className="text-xs text-black/45">{text(p.title)}</div>
        </li>
      )),
    },
    {
      key: "channels",
      label: mf.sections.channels,
      size: channels.length,
      body: channels.map((c, i) => <li key={i}>{c}</li>),
    },
    {
      key: "sources",
      label: mf.sections.sources,
      size: sources.length,
      body: sources.map((url, i) => (
        <li key={i} className="break-all">
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </li>
      )),
    },
  ].filter((section) => section.size > 0);

  return (
    <div className="flex flex-col gap-2">
      {score !== null && (
        <Text>
          {mf.fit}{" "}
          <span className="text-base font-semibold text-[#1d39c4]">
            {score}/5
          </span>
        </Text>
      )}
      {typeof data.summary === "string" && (
        <Paragraph className="mb-0!">{data.summary}</Paragraph>
      )}
      {typeof data.business === "string" && (
        <Paragraph type="secondary" className="mb-0! text-xs">
          {data.business}
        </Paragraph>
      )}
      {sections.length > 0 && (
        <Collapse
          ghost
          size="small"
          items={sections.map((section) => ({
            key: section.key,
            label: `${section.label} (${section.size})`,
            children: (
              <ul className="m-0 flex list-disc flex-col gap-2 pl-4">
                {section.body}
              </ul>
            ),
          }))}
        />
      )}
      {Object.keys(rest).length > 0 && <IntakeDataList data={rest} />}
    </div>
  );
}

function SourceLink({ url }: { url: unknown }) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={mf.source}
    >
      <ExportOutlined className="text-xs" />
    </a>
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const row = record(item);
        return row ? [row] : [];
      })
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
