import { redirect } from "next/navigation";
import { Entitlements } from "@/components/service/entitlements";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-237 — warranties and service contracts (`service.asset.read`). */
export default async function ServiceEntitlementsPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <Entitlements canManage={can(session, "service.asset.manage")} />;
}
