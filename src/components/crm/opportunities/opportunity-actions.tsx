"use client";

import { useState } from "react";
import { App, Input, Modal, Select, Space } from "antd";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { OpportunityLostReason, OpportunityStage } from "@/lib/api/types";

const md = messages.sales.opportunities.detail;

/** ขั้นที่ยังเปิดอยู่ — ตรงกับ `OPEN_OPPORTUNITY_STAGES` ฝั่ง backend. */
export const OPEN_OPPORTUNITY_STAGES: OpportunityStage[] = [
  "qualifying",
  "proposing",
  "negotiating",
];

export function isOpportunityOpen(stage: string): boolean {
  return (OPEN_OPPORTUNITY_STAGES as string[]).includes(stage);
}

/**
 * ปิดแพ้ — เหตุผลมาตรฐานบังคับ (spec CRM). ใช้ร่วมกันระหว่างหน้ารายละเอียด
 * กับกระดานการ์ด เพื่อให้การลากไปคอลัมน์ "แพ้" ผ่านเงื่อนไขเดียวกัน.
 */
export function LoseOpportunityModal({
  opportunity,
  lostReasons,
  onClose,
  onDone,
}: {
  /** null = ปิดกล่อง */
  opportunity: { id: string; opportunityCode: string } | null;
  lostReasons: OpportunityLostReason[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [reason, setReason] = useState<string>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!opportunity || !reason) return;
    setBusy(true);
    const result = await appApi(`opportunities/${opportunity.id}/lose`, {
      method: "POST",
      body: JSON.stringify({
        reason_code: reason,
        reason_text: text.trim() || undefined,
      }),
    });
    setBusy(false);

    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(md.lostDone);
    setReason(undefined);
    setText("");
    onDone();
  }

  return (
    <Modal
      open={opportunity !== null}
      title={`${md.lostTitle} ${opportunity?.opportunityCode ?? ""}`}
      okText={md.lose}
      okButtonProps={{ danger: true, disabled: !reason }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      destroyOnHidden
    >
      <Space orientation="vertical" className="w-full">
        <Select
          className="w-full"
          placeholder={md.lostReason}
          value={reason}
          onChange={(value) => setReason(value)}
          options={lostReasons.map((row) => ({
            value: row.code,
            label: row.name,
          }))}
        />
        <Input.TextArea
          rows={2}
          placeholder={md.lostReasonText}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Space>
    </Modal>
  );
}
