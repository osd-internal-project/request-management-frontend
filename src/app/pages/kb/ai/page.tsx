import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { KbAiLog } from "@/components/kb/kb-ai-log";
import { KbSemanticStatus } from "@/components/kb/kb-semantic-status";

/** CD-265 — what AI channels searched and answered with (knowledge owners). */
export default async function KbAiPage({
  searchParams,
}: {
  searchParams: Promise<{ article_id?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "kb.article.manage")) redirect(ROUTES.kb);
  const { article_id } = await searchParams;
  return (
    <div className="space-y-3">
      <Title level={3} className="!mb-1">
        {messages.kb.ai.title}
      </Title>
      <Card size="small">
        <KbSemanticStatus />
      </Card>
      <Card>
        <KbAiLog articleId={article_id} />
      </Card>
    </div>
  );
}
