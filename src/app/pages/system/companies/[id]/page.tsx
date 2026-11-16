import { redirect } from "next/navigation";
import { SystemCompanyDetailView } from "@/components/system/system-company-detail";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

/** One company from the system plane — organisation-level only, never its work data. */
export default async function SystemCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!canSystem(session, "system.company.manage")) redirect(HOME_PATH);
  const { id } = await params;
  return (
    <SystemCompanyDetailView
      id={id}
      canUsers={canSystem(session, "system.user.read")}
      canManageRoles={canSystem(session, "system.role.manage")}
      canIntegrations={canSystem(session, "system.integration.manage")}
      canAudit={canSystem(session, "system.audit.read")}
    />
  );
}
