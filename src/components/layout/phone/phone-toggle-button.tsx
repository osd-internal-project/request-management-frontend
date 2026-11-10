"use client";

import { Button } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import { messages } from "@/lib/messages";

/** The header's phone-workspace button; filled while the panel is open. */
export function PhoneToggleButton({
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
      icon={<PhoneOutlined className={open ? undefined : "text-[var(--app-primary)]"} />}
      aria-pressed={open}
      aria-label={messages.phone.toggle}
      onClick={onClick}
    >
      <span className="max-md:hidden">{messages.phone.title}</span>
    </Button>
  );
}
