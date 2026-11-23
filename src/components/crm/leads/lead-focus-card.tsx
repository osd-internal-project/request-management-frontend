"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Spin,
  Typography,
} from "antd";
import { ExpandOutlined, ExportOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type { AgentRecordRow } from "@/lib/api/agent-records";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { useAgentRecordStream } from "@/components/agent-records/use-agent-record-stream";
import { IntakeDataList } from "./intake-data-list";
import { suggestionsOf } from "./lead-proposal-card";
import {
  SelectedProductPicker,
  type ProductOption,
} from "./selected-product-picker";

const { Text, Paragraph } = Typography;
const mf = messages.sales.leads.focus;
const ms = mf.sections;

interface Research {
  summary: string;
  business: string;
  products: { product: string; why: string }[];
  fitScore: number | null;
  talkingPoints: string[];
  painPoints: { point: string; url: string | null }[];
  signals: { signal: string; date: string; url: string | null }[];
  decisionMakers: { name: string; title: string; url: string | null }[];
  channels: string[];
  sources: string[];
}

type Row = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const url = (value: unknown): string | null =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
const rows = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.filter((v): v is Row => typeof v === "object" && v !== null)
    : [];
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v !== "")
    : [];

/** `intakeData.research` is Vuvagent's, no schema of ours — keep well-formed parts, null when it is not the known shape. */
function researchOf(value: unknown): Research | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const r = value as Row;
  if (typeof r.summary !== "string" && typeof r.product_fit !== "object") {
    return null;
  }
  const fit =
    typeof r.product_fit === "object" && r.product_fit !== null
      ? (r.product_fit as Row)
      : {};
  return {
    summary: str(r.summary),
    business: str(r.business),
    products: rows(fit.products).flatMap((p) =>
      typeof p.product === "string" && p.product.trim()
        ? [{ product: p.product.trim(), why: str(p.why) }]
        : [],
    ),
    fitScore: typeof fit.fit_score === "number" ? fit.fit_score : null,
    talkingPoints: strings(fit.talking_points),
    painPoints: rows(r.cs_pain_points).flatMap((p) =>
      typeof p.point === "string"
        ? [{ point: p.point, url: url(p.evidence_url) }]
        : [],
    ),
    signals: rows(r.recent_signals).flatMap((s) =>
      typeof s.signal === "string"
        ? [{ signal: s.signal, date: str(s.date), url: url(s.url) }]
        : [],
    ),
    decisionMakers: rows(r.decision_makers).flatMap((d) =>
      typeof d.name === "string"
        ? [{ name: d.name, title: str(d.title), url: url(d.url) }]
        : [],
    ),
    channels: strings(r.customer_channels),
    sources: strings(r.sources).filter((s) => url(s) !== null),
  };
}

/** Only names Vuvagent knows can be written into a proposal, so a research product is pickable when it matches a suggestion. */
function matchProducts(
  products: Research["products"],
  suggestions: ProductOption[],
): { options: ProductOption[]; unlisted: string[] } {
  const known = new Map(
    suggestions.map((s) => [s.product.trim().toLowerCase(), s.product]),
  );
  const options: ProductOption[] = [];
  const unlisted: string[] = [];
  for (const p of products) {
    const name = known.get(p.product.toLowerCase());
    if (name === undefined) unlisted.push(p.product);
    else if (!options.some((o) => o.product === name)) {
      options.push({ product: name, reason: p.why });
    }
  }
  return { options, unlisted };
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">
      {children} <ExportOutlined className="text-xs" />
    </a>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** ทั้ง 8 หัวข้อของผลวิจัย แบบอ่านอย่างเดียว — หัวข้อที่ว่างไม่แสดง. */
function ResearchDetails({ research: r }: { research: Research }) {
  const items: { key: string; label: string; children: ReactNode }[] = [];
  const add = (key: string, label: string, show: boolean, children: ReactNode) => {
    if (show) items.push({ key, label, children });
  };
  add("summary", ms.summary, r.summary !== "", <span className="whitespace-pre-wrap">{r.summary}</span>);
  add("business", ms.business, r.business !== "", <span className="whitespace-pre-wrap">{r.business}</span>);
  add(
    "products",
    ms.products,
    r.products.length > 0,
    <div className="flex flex-col gap-1">
      {r.fitScore !== null && <Text type="secondary">{mf.fitScore(r.fitScore)}</Text>}
      <Bullets
        items={r.products.map((p) => (
          <div key={p.product} className="flex flex-col">
            <Text strong>{p.product}</Text>
            {p.why && <Text type="secondary" className="text-xs">{p.why}</Text>}
          </div>
        ))}
      />
    </div>,
  );
  add("talkingPoints", ms.talkingPoints, r.talkingPoints.length > 0, <Bullets items={r.talkingPoints} />);
  add(
    "painPoints",
    ms.painPoints,
    r.painPoints.length > 0,
    <Bullets
      items={r.painPoints.map((p) => (
        <span key={p.point}>
          {p.point}{" "}
          {p.url && <ExternalLink href={p.url}>{mf.evidence}</ExternalLink>}
        </span>
      ))}
    />,
  );
  add(
    "signals",
    ms.signals,
    r.signals.length > 0,
    <Bullets
      items={r.signals.map((s) => (
        <div key={s.signal} className="flex flex-col">
          {s.date && <Text type="secondary" className="text-xs">{s.date}</Text>}
          <span>
            {s.signal} {s.url && <ExternalLink href={s.url}>{mf.evidence}</ExternalLink>}
          </span>
        </div>
      ))}
    />,
  );
  add(
    "decisionMakers",
    ms.decisionMakers,
    r.decisionMakers.length > 0,
    <Bullets
      items={r.decisionMakers.map((d) => (
        <div key={d.name} className="flex flex-col">
          {d.url ? <ExternalLink href={d.url}>{d.name}</ExternalLink> : <Text strong>{d.name}</Text>}
          {d.title && <Text type="secondary" className="text-xs">{d.title}</Text>}
        </div>
      ))}
    />,
  );
  add("channels", ms.channels, r.channels.length > 0, <Bullets items={r.channels} />);
  add(
    "sources",
    ms.sources,
    r.sources.length > 0,
    <Bullets items={r.sources.map((s) => <ExternalLink key={s} href={s}>{s}</ExternalLink>)} />,
  );
  return <Descriptions size="small" column={1} layout="vertical" items={items} />;
}

/**
 * การ์ด Research Lead — สั่งงาน `lead.research` แล้วแสดง `intakeData.research` ที่ Vuvagent merge เข้ามาเอง:
 * สรุป + สินค้าที่เลือกได้บนการ์ด (ค่าเดียวกับการ์ด Proposal), ทั้งหมดใน modal.
 */
export function LeadFocusCard({
  leadId,
  research: raw,
  suggestions: rawSuggestions,
  selected,
  running: runningRows,
  canStart,
}: {
  leadId: string;
  research: unknown;
  suggestions: unknown;
  selected: unknown;
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
  const hasResult = raw !== undefined && raw !== null;
  const research = researchOf(raw);
  const suggestions = suggestionsOf(rawSuggestions);
  const { options, unlisted } = matchProducts(research?.products ?? [], suggestions);
  // same rule as the Proposal card: a pick outside the current suggestions does not count
  const saved =
    typeof selected === "string" && suggestions.some((s) => s.product === selected)
      ? selected
      : null;

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
        {research && (
          <>
            {research.summary && (
              <div className="flex flex-col">
                <Text strong>{ms.summary}</Text>
                <Paragraph ellipsis={{ rows: 3 }} className="mb-0!">
                  {research.summary}
                </Paragraph>
              </div>
            )}
            {research.products.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Text strong>{ms.products}</Text>
                  {research.fitScore !== null && (
                    <Text type="secondary" className="text-xs">
                      {mf.fitScore(research.fitScore)}
                    </Text>
                  )}
                </div>
                {options.length > 0 && (
                  <SelectedProductPicker
                    leadId={leadId}
                    options={options}
                    saved={saved}
                    disabled={running}
                    canEdit={canStart}
                  />
                )}
                {unlisted.length > 0 && (
                  <Text type="secondary" className="text-xs">
                    {mf.notListed}: {unlisted.join(", ")}
                  </Text>
                )}
                {suggestions.length === 0 && (
                  <Text type="secondary" className="text-xs">
                    {mf.suggestFirst}
                  </Text>
                )}
              </div>
            )}
          </>
        )}
        {hasResult && (
          <div className="flex justify-end">
            <Button
              size="small"
              type="text"
              icon={<ExpandOutlined />}
              onClick={() => setExpanded(true)}
            >
              {mf.expand}
            </Button>
          </div>
        )}
        {!hasResult && !running && <Text type="secondary">{mf.empty}</Text>}
      </div>

      <Modal
        open={expanded}
        title={mf.title}
        width={800}
        footer={null}
        onCancel={() => setExpanded(false)}
        destroyOnHidden
      >
        {research ? (
          <ResearchDetails research={research} />
        ) : typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (
          <IntakeDataList data={raw as Record<string, unknown>} />
        ) : (
          <span className="whitespace-pre-wrap">{JSON.stringify(raw, null, 2)}</span>
        )}
      </Modal>
    </Card>
  );
}
