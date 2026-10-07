import { Card } from "antd";
import Title from "antd/es/typography/Title";
import { messages } from "@/lib/messages";
import { can, getSession } from "@/lib/session";
import { KbGaps } from "@/components/kb/kb-gaps";

/** CD-266 — what the knowledge base can't answer yet, and who is filling it. */
export default async function KbGapsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getSession();
  const { id } = await searchParams;
  return (
    <div className="space-y-3">
      <Title level={3} className="!mb-1">
        {messages.kb.gaps.title}
      </Title>
      <Card>
        <KbGaps canManage={can(session, "kb.article.manage")} focusId={id} />
      </Card>
    </div>
  );
}
