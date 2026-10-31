"use client";

import { Button, Card, Input, Tooltip } from "antd";
import { messages } from "@/lib/messages";

const mf = messages.sales.leads.focus;

/**
 * การ์ด Focus — agent หาข้อมูลของ Lead มาใส่ช่องข้อความ. ยังไม่เชื่อม agent:
 * ปุ่มปิดไว้จนกว่างาน `lead.focus` จะมีการเชื่อมต่อของตัวเอง.
 */
export function LeadFocusCard() {
  return (
    <Card
      size="small"
      title={mf.title}
      className="border-[#adc6ff]! bg-[#f0f5ff]!"
      extra={
        <Tooltip title={mf.notConnected}>
          <Button size="small" type="primary" disabled>
            {mf.run}
          </Button>
        </Tooltip>
      }
    >
      <Input.TextArea
        readOnly
        autoSize={{ minRows: 4 }}
        placeholder={mf.placeholder}
        aria-label={mf.title}
      />
    </Card>
  );
}
