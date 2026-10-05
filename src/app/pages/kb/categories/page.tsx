import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { KbCategories } from "@/components/kb/kb-categories";

const m = messages.kb.categories;

/** CD-259 — process categories of the knowledge base (knowledge owners). */
export default async function KbCategoriesPage() {
  const session = await getSession();
  if (!can(session, "kb.article.manage")) redirect(ROUTES.kb);
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <KbCategories />
      </Card>
    </div>
  );
}
