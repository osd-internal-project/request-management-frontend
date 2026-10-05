import { redirect } from "next/navigation";
import { LabourRates } from "@/components/service/labour-rates";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-243 — selling rates of service labour (`service.asset.read`; writes `service.asset.manage`). */
export default async function ServiceLabourRatesPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <LabourRates canManage={can(session, "service.asset.manage")} />;
}
