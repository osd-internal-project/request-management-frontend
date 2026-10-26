"use client";

import { Checkbox, Space, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { IntegrationMode, IntegrationRow } from "@/lib/api/integrations";
import { messages } from "@/lib/messages";

const m = messages.integrations;
const MODES: readonly IntegrationMode[] = ["app", "delegated"];

/** เรียกได้ในนามใคร — `X-Acting-User` เป็นสีเตือนเพราะทำแทนใครก็ได้. */
export function ModeTags({
  integration,
}: {
  readonly integration: Pick<IntegrationRow, "modes" | "allow_acting_user">;
}) {
  return (
    <Space size={[0, 4]} wrap>
      {integration.modes.map((mode) => (
        <Tag key={mode} color="blue">
          {m.mode[mode]}
        </Tag>
      ))}
      {integration.allow_acting_user && <Tag color="warning">{m.actingUser}</Tag>}
    </Space>
  );
}

/**
 * โหมดเรียก — ติ๊กได้ทั้งสอง เพราะแต่ละ route กำหนดเองว่าต้องเป็นแบบไหน.
 * `actingUser` = แสดงตัวเลือก X-Acting-User ใต้ "ในนามผู้ใช้" (มีผลเฉพาะเมื่อเปิดโหมดนั้น).
 */
export function ModesPicker({
  value,
  onChange,
  actingUser,
}: {
  readonly value: IntegrationMode[];
  readonly onChange: (next: IntegrationMode[]) => void;
  readonly actingUser?: {
    readonly value: boolean;
    readonly onChange: (next: boolean) => void;
  };
}) {
  function toggle(mode: IntegrationMode, on: boolean) {
    const next = on
      ? [...value, mode]
      : value.filter((current) => current !== mode);
    onChange(MODES.filter((item) => next.includes(item)));
    // ปิดในนามผู้ใช้ = X-Acting-User ไม่มีผลแล้ว ปิดตามไปไม่ให้ค้างเป็น true
    if (mode === "delegated" && !on) actingUser?.onChange(false);
  }

  return (
    <div>
      <Text strong className="text-xs">
        {m.formModes}
      </Text>
      <div className="mt-1 grid gap-2">
        {MODES.map((mode) => (
          <div key={mode}>
            <Checkbox
              checked={value.includes(mode)}
              onChange={(e) => toggle(mode, e.target.checked)}
            >
              {m.mode[mode]}
            </Checkbox>
            <div className="pl-6 text-xs text-[var(--app-text-secondary)]">
              {m.modeHint[mode]}
            </div>
            {mode === "delegated" && actingUser && value.includes(mode) && (
              <div className="mt-1 ml-6 rounded-md border border-[var(--app-warning)] px-3 py-2">
                <Checkbox
                  checked={actingUser.value}
                  onChange={(e) => actingUser.onChange(e.target.checked)}
                >
                  {m.formActingUser}
                </Checkbox>
                <div className="pl-6 text-xs text-[var(--app-text-secondary)]">
                  {m.formActingUserHint}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Text type="secondary" className="mt-1 block text-xs">
        {m.formModesHint}
      </Text>
    </div>
  );
}
