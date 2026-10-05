import { redirect } from "next/navigation";
import { ServiceReports } from "@/components/service/service-reports";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-247 — service reports per cover and period (`service.asset.read`). */
export default async function ServiceReportsPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <ServiceReports canManage={can(session, "service.asset.manage")} />;
}
