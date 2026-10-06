import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { AiAudit } from "@/components/admin/ai-audit/ai-audit";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.aiAudit;

/** CD-279 — the AI audit log: MCP tool calls and model calls, and retention. */
export default async function AiAuditPage() {
  const session = await getSession();
  if (!can(session, "admin.ai.audit")) redirect(HOME_PATH);
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <AiAudit />
    </div>
  );
}
