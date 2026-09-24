"use client";

import { Button, Dropdown, Space, Switch } from "antd";
import { DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import type { RequestType } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** The detail card's title: which type, and whether requesters can raise it. */
export function TypeTitle({
  type,
  toggling,
  onToggleActive,
}: {
  readonly type: RequestType;
  readonly toggling: boolean;
  readonly onToggleActive: () => void;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="min-w-0 truncate">
        {messages.requestTypes.edit(type.name, type.code)}
      </span>
      {/* Applies at once, unlike the fields below, which wait for บันทึก. */}
      <Switch
        checked={type.active ?? false}
        loading={toggling}
        checkedChildren={messages.requestTypes.active}
        unCheckedChildren={messages.requestTypes.inactive}
        onChange={onToggleActive}
      />
    </span>
  );
}

/**
 * บันทึก stays the one prominent action; deleting sits behind ⋯ so a
 * destructive click is never one slip away from a save.
 */
export function TypeActions({
  showSave,
  saving,
  onSave,
  onDelete,
}: {
  /** Only the รายละเอียด tab has fields to save; approval tabs publish on their own. */
  readonly showSave: boolean;
  readonly saving: boolean;
  readonly onSave: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <Space>
      {showSave && (
        <Button type="primary" loading={saving} onClick={onSave}>
          {messages.requestTypes.save}
        </Button>
      )}
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            {
              key: "delete",
              danger: true,
              icon: <DeleteOutlined />,
              label: messages.requestTypes.deleteType,
            },
          ],
          onClick: ({ key }) => {
            if (key === "delete") onDelete();
          },
        }}
      >
        <Button
          icon={<MoreOutlined />}
          aria-label={messages.requestTypes.moreActions}
        />
      </Dropdown>
    </Space>
  );
}
