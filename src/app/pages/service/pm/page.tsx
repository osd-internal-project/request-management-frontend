import { redirect } from "next/navigation";
import { PmRounds } from "@/components/service/pm-plan";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-244 — PM rounds of every service contract (`service.asset.read`). */
export default async function ServicePmPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <PmRounds canManage={can(session, "service.asset.manage")} />;
}
