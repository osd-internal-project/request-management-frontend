import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LlmAdmin } from "@/components/admin/llm/llm-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.llm;

/** CD-275 — the LLM Gateway: model per AI task, quotas, prices, usage. */
export default async function LlmAdminPage() {
  const session = await getSession();
  if (!can(session, "admin.llm.manage")) redirect(HOME_PATH);
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <LlmAdmin />
    </div>
  );
}
