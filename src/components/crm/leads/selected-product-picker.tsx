"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Radio, Typography } from "antd";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const { Text } = Typography;
const mp = messages.sales.leads.proposal;

export interface ProductOption {
  product: string;
  reason: string;
}

/**
 * เลือกสินค้า 1 ตัวแล้วบันทึกเป็น `intakeData.selected_product` — การ์ด Proposal และ Research ใช้ค่าเดียวกัน.
 * `saved` มาจาก server เสมอ ค่าที่ติ๊กค้างไว้ (`draft`) ล้างเมื่อบันทึก เพื่อให้ตามการ์ดอีกใบหลัง refresh.
 */
export function SelectedProductPicker({
  leadId,
  options,
  saved,
  disabled,
  canEdit,
}: {
  leadId: string;
  options: ProductOption[];
  saved: string | null;
  disabled: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choice = draft ?? saved;

  async function save() {
    if (!choice) return;
    setSaving(true);
    setError(null);
    const result = await appApi(`leads/${leadId}/intake-data`, {
      method: "PATCH",
      body: JSON.stringify({ data: { selected_product: choice } }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDraft(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Radio.Group
        value={choice}
        disabled={!canEdit || disabled}
        onChange={(e) => setDraft(e.target.value as string)}
        className="flex! flex-col gap-2"
      >
        {options.map((row) => (
          <Radio key={row.product} value={row.product}>
            <div className="flex min-w-0 flex-col">
              <Text strong>{row.product}</Text>
              {row.reason && (
                <Text type="secondary" className="text-xs">
                  {row.reason}
                </Text>
              )}
            </div>
          </Radio>
        ))}
      </Radio.Group>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            size="small"
            loading={saving}
            disabled={!choice || choice === saved || disabled}
            onClick={() => void save()}
          >
            {mp.save}
          </Button>
        </div>
      )}
      {error && <Alert type="error" showIcon title={error} />}
    </div>
  );
}
