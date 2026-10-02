import { redirect } from "next/navigation";
import { LaborRates } from "@/components/hr/labor-rates";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

/** CD-207 — อัตราต้นทุนบุคลากร (part of CD-17 HR). */
export default async function LaborRatesPage() {
  const session = await getSession();
  if (!canAny(session, ["hr.rate.read", "hr.rate.manage"])) redirect(HOME_PATH);
  return <LaborRates canManage={can(session, "hr.rate.manage")} />;
}
