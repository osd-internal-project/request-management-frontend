"use client";

import { Alert, Descriptions, List, Space, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { thaiDate } from "./delivery-types";

const m = messages.delivery.handover;

/** CD-255 — what a round hands the service team, read live. */
export interface HandoverPackage {
  contractNo: string | null;
  assets: {
    id: string;
    name: string;
    model: string | null;
    serialNo: string | null;
    location: string | null;
  }[];
  warranties: { id: string; title: string; startOn: string; endOn: string }[];
  serviceTerms: {
    warrantyMonths: number | null;
    warrantyScope: string | null;
    serviceLevels: unknown;
    coverage: string | null;
    reportEvery: string | null;
  } | null;
  documents: { id: string; title: string; fileName: string }[];
  certificate: { id: string; certificateNo: string; source: string } | null;
  contacts: {
    id: string;
    name: string;
    role: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    isPrimary: boolean;
  }[];
  openPoints: { text: string; dueOn: string }[];
}

export interface HandoverState {
  id: string;
  status: "sent" | "questioned" | "acknowledged";
  note: string;
  sentBy: string;
  sentAt: string;
  question: string | null;
  questionedBy: string | null;
  questionedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  ackNote: string | null;
}

export const HANDOVER_COLOR: Record<string, string> = {
  none: "default",
  sent: "processing",
  questioned: "warning",
  acknowledged: "success",
};

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

export const when = (at: string) =>
  new Date(at).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** The exchange so far: who sent, what was asked, who acknowledged. */
export function HandoverTrail({ state }: { state: HandoverState }) {
  return (
    <Space orientation="vertical" size={0}>
      <Text type="secondary" className="text-xs">
        {fill(m.sentBy, { n: state.sentBy, d: when(state.sentAt) })}
      </Text>
      {state.note ? <Text className="text-xs">“{state.note}”</Text> : null}
      {state.question ? (
        <Text type="warning" className="text-xs">
          {fill(m.question, { n: state.questionedBy ?? "" })}: {state.question}
        </Text>
      ) : null}
      {state.acknowledgedAt ? (
        <Text type="success" className="text-xs">
          {fill(m.ackBy, {
            n: state.acknowledgedBy ?? "",
            d: when(state.acknowledgedAt),
          })}
          {state.ackNote ? ` — ${state.ackNote}` : ""}
        </Text>
      ) : null}
    </Space>
  );
}

export function HandoverPackageView({ pack }: { pack: HandoverPackage }) {
  const terms = pack.serviceTerms;
  return (
    <Space orientation="vertical" className="w-full" size="middle">
      {!pack.warranties.length && (
        <Alert type="warning" showIcon title={m.noWarranty} />
      )}
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label={fill(m.assets, { n: pack.assets.length })}>
          {pack.assets.length ? (
            <List
              size="small"
              dataSource={pack.assets}
              renderItem={(a) => (
                <List.Item className="!px-0">
                  {a.name}
                  {a.model ? ` · ${a.model}` : ""}
                  {a.serialNo ? ` · S/N ${a.serialNo}` : ""}
                  {a.location ? ` · ${a.location}` : ""}
                </List.Item>
              )}
            />
          ) : (
            m.empty
          )}
        </Descriptions.Item>
        <Descriptions.Item
          label={fill(m.warranties, { n: pack.warranties.length })}
        >
          {pack.warranties.length
            ? pack.warranties.map((w) => (
                <div key={w.id}>
                  {w.title} ({thaiDate(w.startOn)} – {thaiDate(w.endOn)})
                </div>
              ))
            : m.empty}
        </Descriptions.Item>
        <Descriptions.Item label={m.serviceTerms}>
          {terms ? (
            <Space orientation="vertical" size={0}>
              {pack.contractNo ? <Text>{pack.contractNo}</Text> : null}
              {terms.warrantyMonths ? (
                <Text>
                  {fill(m.warrantyMonths, { n: terms.warrantyMonths })}
                </Text>
              ) : null}
              {terms.warrantyScope ? <Text>{terms.warrantyScope}</Text> : null}
              {terms.coverage ? <Tag>{terms.coverage}</Tag> : null}
              {terms.reportEvery ? (
                <Text>{fill(m.reportEvery, { v: terms.reportEvery })}</Text>
              ) : null}
            </Space>
          ) : (
            m.empty
          )}
        </Descriptions.Item>
        <Descriptions.Item
          label={fill(m.documents, { n: pack.documents.length })}
        >
          {pack.documents.length
            ? pack.documents.map((d) => <div key={d.id}>{d.title}</div>)
            : m.empty}
        </Descriptions.Item>
        <Descriptions.Item label={m.certificate}>
          {pack.certificate ? pack.certificate.certificateNo : m.noCertificate}
        </Descriptions.Item>
        <Descriptions.Item
          label={fill(m.contacts, { n: pack.contacts.length })}
        >
          {pack.contacts.length
            ? pack.contacts.map((c) => (
                <div key={c.id}>
                  {c.isPrimary ? "★ " : ""}
                  {c.name}
                  {c.position ? ` (${c.position})` : ""}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.email ? ` · ${c.email}` : ""}
                </div>
              ))
            : m.empty}
        </Descriptions.Item>
        <Descriptions.Item
          label={fill(m.openPoints, { n: pack.openPoints.length })}
        >
          {pack.openPoints.length
            ? pack.openPoints.map((p, i) => (
                <div key={i}>
                  {p.text} ({thaiDate(p.dueOn)})
                </div>
              ))
            : m.empty}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

export { fill };
