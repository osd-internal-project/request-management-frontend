"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Card, Dropdown, Space, Tag } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import {
  isLeadLost,
  isLeadOpen,
  type LostStatus,
} from "@/components/crm/leads/lead-actions";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { LeadRow, LeadStatus } from "@/lib/api/types";

const m = messages.sales.leads;
const mb = m.board;

/**
 * ลำดับคอลัมน์ของกระดาน — เดินตาม pipeline ของหน้ารายละเอียด (`lead-detail.tsx`)
 * แล้วต่อท้ายด้วยทางออก Lost / Disqualified ซึ่งไม่ใช่ขั้นระหว่างทาง.
 */
const BOARD_COLUMNS: LeadStatus[] = [
  "new",
  "cannot_contact",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "converted",
  "lost",
  "disqualified",
];

/**
 * คอลัมน์ที่กระดานต้องวาดจริง — คอลัมน์มาตรฐานบวกสถานะอื่นที่มีใบค้างอยู่.
 *
 * สถานะ Lead ตั้งค่าได้ต่อบริษัท (backend `lead-status.service.ts`) ดังนั้นแถวที่
 * อ่านมาอาจอยู่ในขั้นที่ไม่มีในรายการข้างบน — ถ้าไม่เผื่อไว้ ใบเหล่านั้นจะหายไป
 * จากกระดานทั้งที่ตารางยังเห็น.
 */
function columnsFor(rows: LeadRow[]): string[] {
  const extra = rows
    .map((row) => row.status as string)
    .filter((status) => !BOARD_COLUMNS.includes(status as LeadStatus));

  return [...BOARD_COLUMNS, ...new Set(extra)];
}

/**
 * มุมมองการ์ดของทะเบียน Lead — หนึ่งคอลัมน์ต่อหนึ่งสถานะ ลากการ์ดข้ามคอลัมน์
 * เพื่อเลื่อนขั้นได้.
 *
 * การลากทำได้เฉพาะใบที่ยังเปิดอยู่และคนที่มีสิทธิ์จัดการเท่านั้น. ปลายทางสอง
 * ช่องไม่ได้ยิง `PATCH /leads/:id/status` ตรง ๆ เพราะทั้งคู่ต้องการข้อมูลเพิ่ม:
 * "แปลงเป็นโอกาสการขาย" ต้องเลือกลูกค้า และ "คัดออก" ต้องมีเหตุผล — จึงส่งต่อ
 * ให้ modal เดียวกับที่ตารางและหน้ารายละเอียดใช้.
 */
export function LeadBoard({
  rows,
  total,
  canManage,
  onEdit,
  onConvert,
  onDisqualify,
  onMoved,
}: {
  rows: LeadRow[];
  total: number;
  canManage: boolean;
  onEdit: (lead: LeadRow) => void;
  onConvert: (lead: LeadRow) => void;
  onDisqualify: (lead: LeadRow, closeAs?: LostStatus) => void;
  onMoved: () => void;
}) {
  const { message } = App.useApp();
  const [dragging, setDragging] = useState<LeadRow | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const columns = columnsFor(rows);

  /** ลากได้ต่อเมื่อจัดการได้และใบยังไม่ปิด — ใบที่ปิดแล้วไม่มีทางกลับ. */
  const draggable = (lead: LeadRow) => canManage && isLeadOpen(lead.status);

  function accepts(status: string): boolean {
    return (
      dragging !== null && draggable(dragging) && dragging.status !== status
    );
  }

  async function move(lead: LeadRow, status: string) {
    setBusyId(lead.id);
    const result = await appApi(`leads/${lead.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setBusyId(null);

    if (!result.ok) {
      message.error(result.message);
      return;
    }

    message.success(mb.moved);
    onMoved();
  }

  function drop(status: string) {
    const lead = dragging;
    setDragging(null);
    setHovered(null);
    if (!lead || !accepts(status)) return;

    // ปลายทางต้องกรอกข้อมูลเพิ่มก่อน จึงเปิด modal แทนการยิง PATCH
    if (status === "converted") onConvert(lead);
    else if (isLeadLost(status)) onDisqualify(lead, status);
    else void move(lead, status);
  }

  return (
    <div className="space-y-2">
      {canManage && (
        <Text type="secondary" className="text-xs">
          {mb.dragHint}
        </Text>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((status) => {
          const cards = rows.filter((row) => row.status === status);
          const active = accepts(status);

          return (
            <div
              key={status}
              className={`flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors ${
                active && hovered === status
                  ? "border-blue-400 bg-blue-50"
                  : "border-transparent bg-black/3"
              }`}
              onDragOver={(event) => {
                if (!active) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setHovered(status);
              }}
              onDragLeave={() =>
                setHovered((at) => (at === status ? null : at))
              }
              onDrop={(event) => {
                event.preventDefault();
                drop(status);
              }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <Tag color={m.statusColor[status]} className="m-0!">
                  {m.status[status] ?? status}
                </Tag>
                <Text type="secondary" className="text-xs">
                  {mb.count(cards.length)}
                </Text>
              </div>

              <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto">
                {cards.length === 0 ? (
                  <Text
                    type="secondary"
                    className="px-1 py-4 text-center text-xs"
                  >
                    {mb.empty}
                  </Text>
                ) : (
                  cards.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      canManage={canManage}
                      draggable={draggable(lead)}
                      busy={busyId === lead.id}
                      onDragStart={() => setDragging(lead)}
                      onDragEnd={() => {
                        setDragging(null);
                        setHovered(null);
                      }}
                      onEdit={() => onEdit(lead)}
                      onConvert={() => onConvert(lead)}
                      onDisqualify={() => onDisqualify(lead)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {total > rows.length && (
        <Text type="secondary" className="text-xs">
          {mb.pageNote(rows.length, total)}
        </Text>
      )}
    </div>
  );
}

/** ใบเดียวบนกระดาน — ข้อมูลเท่าที่ตัดสินใจได้โดยไม่ต้องเปิดหน้ารายละเอียด. */
function LeadCard({
  lead,
  canManage,
  draggable,
  busy,
  onDragStart,
  onDragEnd,
  onEdit,
  onConvert,
  onDisqualify,
}: {
  lead: LeadRow;
  canManage: boolean;
  draggable: boolean;
  busy: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onDisqualify: () => void;
}) {
  const contact = [lead.contactName, lead.phone, lead.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      size="small"
      className={`${draggable ? "cursor-grab" : ""} ${busy ? "opacity-50" : ""}`}
      styles={{ body: { padding: 10 } }}
      draggable={draggable}
      onDragStart={(event) => {
        // Firefox ไม่เริ่มลากเลยถ้าไม่มี payload
        event.dataTransfer.setData("text/plain", lead.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <Space orientation="vertical" size={2} className="w-full">
        <Link href={ROUTES.leadDetail(lead.id)} className="font-medium">
          {lead.name}
        </Link>

        {lead.customer && (
          <Link href={ROUTES.customerDetail(lead.customer.id)}>
            <Text type="secondary" className="text-xs">
              {lead.customer.customerCode} · {lead.customer.nameTh}
            </Text>
          </Link>
        )}

        {contact && (
          <Text type="secondary" className="text-xs">
            {contact}
          </Text>
        )}

        {lead.sourceCode && <Tag className="m-0! mt-1">{lead.sourceCode}</Tag>}

        {lead.convertedOpportunity && (
          <Link href={ROUTES.opportunityDetail(lead.convertedOpportunity.id)}>
            <Text type="secondary" className="text-xs">
              {lead.convertedOpportunity.opportunityCode}
            </Text>
          </Link>
        )}

        {isLeadLost(lead.status) && lead.disqualifyReason && (
          <Text type="secondary" className="text-xs">
            {lead.disqualifyReason}
          </Text>
        )}

        {canManage && isLeadOpen(lead.status) && (
          <Space size={4} className="mt-1">
            <Button size="small" onClick={onEdit}>
              {m.actions.edit}
            </Button>
            {/*
              แปลง/คัดออกอยู่ในเมนู ไม่ใช่ปุ่มเต็ม — ป้ายสองอันนี้ยาวกว่าความกว้าง
              การ์ด กางเป็นปุ่มแล้วตัดบรรทัดจนอ่านชื่อ Lead ไม่ทัน. คนที่ลากได้ก็
              ยังลากไปวางคอลัมน์ปลายทางได้เหมือนเดิม.
            */}
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "convert", label: m.actions.convert },
                  {
                    key: "disqualify",
                    label: m.actions.disqualify,
                    danger: true,
                  },
                ],
                onClick: ({ key }) =>
                  key === "convert" ? onConvert() : onDisqualify(),
              }}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )}
      </Space>
    </Card>
  );
}
