"use client";

import { useState } from "react";
import { App, Button, Input, Space, Tooltip } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.integrations.secret;

/**
 * ค่าลับของระบบภายนอก (กุญแจ `rfk_` / secret `whsec_`) แบบ password ที่กดดูได้.
 *
 * ไม่ดึงค่าจนกว่าจะกดดูหรือคัดลอก — การดึงแต่ละครั้งลง audit ฝั่ง backend.
 * `value` = มีค่าอยู่แล้ว (เพิ่งออก) ไม่ต้องดึง.
 */
export function SecretField({
  hint,
  value: initial,
  load,
}: {
  readonly hint: string;
  readonly value?: string;
  readonly load?: () => Promise<ClientResult<string>>;
}) {
  const { message } = App.useApp();
  const [value, setValue] = useState(initial ?? null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  async function ensure(): Promise<string | null> {
    if (value !== null) return value;
    if (!load) return null;
    setBusy(true);
    const result = await load();
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return null;
    }
    setValue(result.data);
    return result.data;
  }

  async function toggle(next: boolean) {
    if (next && (await ensure()) === null) return;
    setVisible(next);
  }

  async function copy() {
    const secret = await ensure();
    if (secret === null) return;
    try {
      await navigator.clipboard.writeText(secret);
      message.success(m.copied);
    } catch {
      // http ที่ไม่ใช่ localhost ไม่มี clipboard API — เปิดค่าให้คัดลอกเอง
      setVisible(true);
      message.warning(m.copyFailed);
    }
  }

  return (
    <Space.Compact className="w-full max-w-md">
      <Input.Password
        readOnly
        size="small"
        className="font-mono text-xs"
        value={value ?? ""}
        placeholder={hint}
        visibilityToggle={{ visible, onVisibleChange: (next) => void toggle(next) }}
        suffix={busy ? <span className="text-xs">…</span> : undefined}
        aria-label={m.label}
      />
      <Tooltip title={m.copy}>
        <Button
          size="small"
          icon={<CopyOutlined />}
          aria-label={m.copy}
          loading={busy}
          onClick={() => void copy()}
        />
      </Tooltip>
    </Space.Compact>
  );
}

/** แปลงคำตอบ `{ key }` / `{ secret }` ให้เป็นค่าเดียวที่ `SecretField` ต้องการ. */
export function unwrap<T>(
  result: ClientResult<T>,
  pick: (data: T) => string,
): ClientResult<string> {
  return result.ok ? { ...result, data: pick(result.data) } : result;
}
