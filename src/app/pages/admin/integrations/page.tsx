import { redirect } from "next/navigation";
import { IntegrationList } from "@/components/admin/integrations/integration-list";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

/** ระบบภายนอก — ที่เดียวของกุญแจ API, webhook และ MCP (`admin.integration.manage`). */
export default async function AdminIntegrationsPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.integrations.title} subtitle={messages.integrations.subtitle} />

      <IntegrationList />
    </div>
  );
}
