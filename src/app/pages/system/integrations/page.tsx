import { redirect } from "next/navigation";
import { IntegrationList } from "@/components/admin/integrations/integration-list";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

/** Hub — every company's integrations and the shared ones (`system.integration.manage`). */
export default async function SystemIntegrationsPage() {
  const session = await getSession();
  if (!canSystem(session, "system.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.integrations.hub.title} subtitle={messages.integrations.hub.subtitle} />
      <IntegrationList scope="system" />
    </div>
  );
}
