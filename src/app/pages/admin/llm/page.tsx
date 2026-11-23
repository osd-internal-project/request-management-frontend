import { redirect } from "next/navigation";
import { LlmAdmin } from "@/components/admin/llm/llm-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

const m = messages.llm;

/** CD-275 — the LLM Gateway: model per AI task, quotas, prices, usage. */
export default async function LlmAdminPage() {
  const session = await getSession();
  if (!can(session, "admin.llm.manage")) redirect(HOME_PATH);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <LlmAdmin />
    </div>
  );
}
