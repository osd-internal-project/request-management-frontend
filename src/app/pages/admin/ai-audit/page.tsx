import { redirect } from "next/navigation";
import { AiAudit } from "@/components/admin/ai-audit/ai-audit";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

const m = messages.aiAudit;

/** CD-279 — the AI audit log: MCP tool calls and model calls, and retention. */
export default async function AiAuditPage() {
  const session = await getSession();
  if (!can(session, "admin.ai.audit")) redirect(HOME_PATH);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <AiAudit />
    </div>
  );
}
