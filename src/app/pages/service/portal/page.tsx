import { redirect } from "next/navigation";
import { PortalContacts } from "@/components/service/portal-contacts";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-249 — Customer Portal contacts (`service.asset.read`; invites `service.asset.manage`). */
export default async function ServicePortalPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <PortalContacts canManage={can(session, "service.asset.manage")} />;
}
