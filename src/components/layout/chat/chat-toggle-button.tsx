"use client";

import { Button } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { messages } from "@/lib/messages";

/** The header's AI-assistant button; filled while the panel is open. */
export function ChatToggleButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      shape="round"
      type={open ? "primary" : "default"}
      icon={<RobotOutlined />}
      aria-pressed={open}
      aria-label={messages.chat.toggle}
      onClick={onClick}
    >
      <span className="max-md:hidden">{messages.chat.title}</span>
    </Button>
  );
}
