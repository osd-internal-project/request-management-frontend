import { redirect } from "next/navigation";
import { CostCentersAdmin } from "@/components/admin/cost-centers-admin";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** Cost Center master — the list forms pick from; the active company's only. */
export default async function CostCentersPage() {
  const session = await getSession();
  if (!can(session, "admin.cost-center.manage")) redirect(HOME_PATH);
  return <CostCentersAdmin />;
}
