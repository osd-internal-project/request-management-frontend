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

export function ModesPicker({
  value,
  onChange,
}: {
  readonly value: IntegrationMode[];
  readonly onChange: (next: IntegrationMode[]) => void;
}) {
  return (
    <div>
      <Text strong className="text-xs">
        {m.formModes}
      </Text>
      <Checkbox.Group
        className="mt-1 flex flex-col gap-1"
        value={value}
        options={MODES.map((mode) => ({ value: mode, label: m.mode[mode] }))}
        // ค่าที่ติ๊กได้มาจาก `options` ด้านบนเท่านั้น
        onChange={(next) => onChange(next as IntegrationMode[])}
      />
      <Text type="secondary" className="text-xs">
        {m.formModesHint}
      </Text>
    </div>
  );
}
