import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ChatWidgetSettings } from "@/components/admin/chat-widget/chat-widget-settings";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.chatWidget;

/** The company's LibreChat chats, and which org units get which. */
export default async function ChatWidgetPage() {
  const session = await getSession();
  if (!can(session, "admin.chat-widget.manage")) redirect(HOME_PATH);
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <ChatWidgetSettings />
    </div>
  );
}
