"use client";

import { useState, type ReactNode } from "react";
import { Button, Card, Descriptions } from "antd";
import { EditOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";

const md = messages.sales.leads.detail;

export interface LeadField {
  label: string;
  /** `null` = not filled yet; hidden until the reader asks for the empty fields */
  value: ReactNode | null;
}

/** ข้อมูลบริษัท/ที่อยู่ในคอลัมน์แคบ — แสดงเฉพาะช่องที่มีค่า ช่องว่างเปิดดูได้. */
export function LeadFieldsCard({
  title,
  fields,
  onEdit,
}: {
  title: string;
  fields: LeadField[];
  onEdit: (() => void) | null;
}) {
  const [showEmpty, setShowEmpty] = useState(false);
  const filled = fields.filter((field) => field.value !== null);
  const empty = fields.length - filled.length;
  const shown = showEmpty ? fields : filled;

  return (
    <Card
      size="small"
      title={title}
      extra={
        onEdit ? (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={onEdit}
          />
        ) : null
      }
    >
      {shown.length > 0 ? (
        <Descriptions size="small" column={1} layout="vertical">
          {shown.map((field) => (
            <Descriptions.Item key={field.label} label={field.label}>
              {field.value ?? "—"}
            </Descriptions.Item>
          ))}
        </Descriptions>
      ) : (
        <Text type="secondary" className="text-xs">
          {md.noCompanyInfo}
        </Text>
      )}
      {empty > 0 && (
        <Button
          type="link"
          size="small"
          className="px-0!"
          onClick={() => setShowEmpty((open) => !open)}
        >
          {showEmpty ? md.hideEmpty : md.showEmpty(empty)}
        </Button>
      )}
    </Card>
  );
}
