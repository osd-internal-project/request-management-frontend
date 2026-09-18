"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Card, Dropdown, Space, Tag } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import {
  OPEN_OPPORTUNITY_STAGES,
  isOpportunityOpen,
} from "@/components/opportunity-actions";
import {
  FollowUpTags,
  formatAmount,
  OpportunityParty,
} from "@/components/opportunity-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { OpportunityRow } from "@/lib/api/types";

const m = messages.sales.opportunities;
const mb = m.board;

/** ลำดับคอลัมน์ — ขั้นระหว่างทางตามลำดับ แล้วต่อด้วยทางออก ชนะ / แพ้. */
const BOARD_COLUMNS: string[] = [...OPEN_OPPORTUNITY_STAGES, "won", "lost"];

/**
 * มุมมองการ์ดของทะเบียนโอกาสการขาย — หนึ่งคอลัมน์ต่อหนึ่งขั้น ลากการ์ดข้าม
 * คอลัมน์เพื่อเลื่อนขั้นได้ (แบบเดียวกับ `lead-board.tsx`).
 *
 * ขั้นระหว่างทางยิง `PATCH /opportunities/:id` ตรง ๆ. ปลายทางสองช่องต้องการ
 * ข้อมูลเพิ่ม จึงส่งต่อให้ทางเดิม: "ชนะ" = เปิดใบสั่งขาย (สร้างทะเบียนลูกค้า,
 * PO 10 ก.ย. 2569) ซึ่งทำในหน้ารายละเอียด และ "แพ้" ต้องมีเหตุผลมาตรฐาน.
 */
export function OpportunityBoard({
  rows,
  total,
  canManage,
  onWin,
  onLose,
  onMoved,
}: {
  rows: OpportunityRow[];
  total: number;
  canManage: boolean;
  onWin: (opportunity: OpportunityRow) => void;
  onLose: (opportunity: OpportunityRow) => void;
  onMoved: () => void;
}) {
  const { message } = App.useApp();
  const [dragging, setDragging] = useState<OpportunityRow | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const draggable = (row: OpportunityRow) =>
    canManage && isOpportunityOpen(row.stage);

  function accepts(stage: string): boolean {
    return dragging !== null && draggable(dragging) && dragging.stage !== stage;
  }

  async function move(row: OpportunityRow, stage: string) {
    setBusyId(row.id);
    const result = await appApi(`opportunities/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
    setBusyId(null);

    if (!result.ok) {
      message.error(result.message);
      return;
    }

    message.success(mb.moved);
    onMoved();
  }

  function drop(stage: string) {
    const row = dragging;
    setDragging(null);
    setHovered(null);
    if (!row || !accepts(stage)) return;

    if (stage === "won") onWin(row);
    else if (stage === "lost") onLose(row);
    else void move(row, stage);
  }

  return (
    <div className="space-y-2">
      {canManage && (
        <Text type="secondary" className="text-xs">
          {mb.dragHint}
        </Text>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((stage) => {
          const cards = rows.filter((row) => row.stage === stage);
          const active = accepts(stage);
          const sum = cards.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);

          return (
            <div
              key={stage}
              className={`flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors ${
                active && hovered === stage
                  ? "border-blue-400 bg-blue-50"
                  : "border-transparent bg-black/3"
              }`}
              onDragOver={(event) => {
                if (!active) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setHovered(stage);
              }}
              onDragLeave={() => setHovered((at) => (at === stage ? null : at))}
              onDrop={(event) => {
                event.preventDefault();
                drop(stage);
              }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <Tag color={m.stageColor[stage]} className="m-0!">
                  {m.stage[stage] ?? stage}
                </Tag>
                <Text type="secondary" className="text-xs">
                  {mb.count(cards.length)}
                  {sum > 0 && ` · ${formatAmount(sum)}`}
                </Text>
              </div>

              <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto">
                {cards.length === 0 ? (
                  <Text type="secondary" className="px-1 py-4 text-center text-xs">
                    {mb.empty}
                  </Text>
                ) : (
                  cards.map((row) => (
                    <OpportunityCard
                      key={row.id}
                      opportunity={row}
                      canManage={canManage}
                      draggable={draggable(row)}
                      busy={busyId === row.id}
                      onDragStart={() => setDragging(row)}
                      onDragEnd={() => {
                        setDragging(null);
                        setHovered(null);
                      }}
                      onWin={() => onWin(row)}
                      onLose={() => onLose(row)}
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
function OpportunityCard({
  opportunity,
  canManage,
  draggable,
  busy,
  onDragStart,
  onDragEnd,
  onWin,
  onLose,
}: {
  opportunity: OpportunityRow;
  canManage: boolean;
  draggable: boolean;
  busy: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onWin: () => void;
  onLose: () => void;
}) {
  return (
    <Card
      size="small"
      className={`${draggable ? "cursor-grab" : ""} ${busy ? "opacity-50" : ""}`}
      styles={{ body: { padding: 10 } }}
      draggable={draggable}
      onDragStart={(event) => {
        // Firefox ไม่เริ่มลากเลยถ้าไม่มี payload
        event.dataTransfer.setData("text/plain", opportunity.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <Space orientation="vertical" size={2} className="w-full">
        <Link href={ROUTES.opportunityDetail(opportunity.id)} className="font-medium">
          {opportunity.title}
        </Link>
        <Text type="secondary" className="text-xs">
          {opportunity.opportunityCode}
        </Text>

        <div className="text-xs">
          <OpportunityParty row={opportunity} />
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span>
            {formatAmount(opportunity.amount)} {opportunity.currency}
          </span>
          {opportunity.expectedCloseAt && (
            <Text type="secondary" className="text-xs">
              {m.columns.expectedClose} {dayjs(opportunity.expectedCloseAt).format("D MMM YY")}
            </Text>
          )}
        </div>

        {/* CD-65 — นัดติดตามเลยกำหนด / ดีลเงียบ */}
        {(opportunity.nextFollowUpAt || opportunity.staleAlertedAt) && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {opportunity.nextFollowUpAt && (
              <Text type="secondary" className="text-xs">
                {m.columns.nextFollowUp}{" "}
                {dayjs(opportunity.nextFollowUpAt).format("D MMM HH:mm")}
              </Text>
            )}
            <FollowUpTags row={opportunity} />
          </div>
        )}

        {canManage && isOpportunityOpen(opportunity.stage) && (
          <Space size={4} className="mt-1">
            <Link href={ROUTES.opportunityDetail(opportunity.id)}>
              <Button size="small">{m.detail.edit}</Button>
            </Link>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "win", label: m.detail.openSaleOrder },
                  { key: "lose", label: m.detail.lose, danger: true },
                ],
                onClick: ({ key }) => (key === "win" ? onWin() : onLose()),
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
