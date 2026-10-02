import { redirect } from "next/navigation";
import { VendorCostList } from "@/components/pricing/vendor-cost-list";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-206 — ต้นทุนคู่ค้าจาก SAP. */
export default async function VendorCostsPage() {
  const session = await getSession();
  if (!can(session, "pricing.price.read")) redirect(HOME_PATH);
  return <VendorCostList canManage={can(session, "pricing.price.manage")} />;
}
