import { redirect } from "next/navigation";
import { Claims } from "@/components/service/claims";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-245 — claims to suppliers (`service.asset.read`). */
export default async function ServiceClaimsPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <Claims canManage={can(session, "service.asset.manage")} />;
}
