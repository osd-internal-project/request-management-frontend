import { redirect } from "next/navigation";
import { ChatWidgetSettings } from "@/components/admin/chat-widget/chat-widget-settings";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

const m = messages.chatWidget;

/** The company's LibreChat chats, and which org units get which. */
export default async function ChatWidgetPage() {
  const session = await getSession();
  if (!can(session, "admin.chat-widget.manage")) redirect(HOME_PATH);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <ChatWidgetSettings />
    </div>
  );
}
