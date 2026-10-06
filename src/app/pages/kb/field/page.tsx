import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";
import { KbFieldInbox } from "@/components/kb/kb-field-inbox";

const f = messages.kb.field;

/** CD-262 — closed service jobs waiting to become knowledge. */
export default async function KbFieldPage() {
  const session = await getSession();
  if (!canAny(session, ["kb.article.manage", "service.asset.manage"]))
    redirect(ROUTES.kb);
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {f.title}
        </Title>
        <Text type="secondary">{f.hint}</Text>
      </div>
      <Card>
        <KbFieldInbox />
      </Card>
    </div>
  );
}
