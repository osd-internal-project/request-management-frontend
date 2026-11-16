import { redirect } from "next/navigation";
import { SystemCompaniesAdmin } from "@/components/system/system-companies-admin";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

export default async function SystemCompaniesPage() {
  const session = await getSession();
  if (!canSystem(session, "system.company.manage")) redirect(HOME_PATH);
  return (
    <SystemCompaniesAdmin
      canIntegrations={canSystem(session, "system.integration.manage")}
      canPickAdmin={canSystem(session, "system.user.read")}
    />
  );
}
