import { redirect } from "next/navigation";
import { ServiceBillings } from "@/components/service/service-billings";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-242 — billed service jobs sent to SAP (`service.asset.read`). */
export default async function ServiceBillingPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <ServiceBillings />;
}
