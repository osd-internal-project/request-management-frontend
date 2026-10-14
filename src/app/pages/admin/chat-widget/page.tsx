import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ChatWidgetSettings } from "@/components/admin/chat-widget/chat-widget-settings";
import {
  LIBRECHAT_WIDGET_PUBLIC_ID,
  LIBRECHAT_WIDGET_URL,
} from "@/lib/backend";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.chatWidget;

/** Which LibreChat host the ผู้ช่วย AI panel loads, for http and https pages. */
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
      <ChatWidgetSettings
        envUrl={LIBRECHAT_WIDGET_URL}
        envPublicId={LIBRECHAT_WIDGET_PUBLIC_ID}
      />
    </div>
  );
}
