import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import { CareConversations } from "@/components/care/care-conversations";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-280 — AI CARE conversations with customers (`service.care.manage`). */
export default async function CareConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "service.care.manage")) redirect(HOME_PATH);
  const { id } = await searchParams;
  return (
    <div className="space-y-3">
      <Title level={3} className="!mb-1">
        {messages.care.title}
      </Title>
      <Card>
        <CareConversations focusId={id} />
      </Card>
    </div>
  );
}
