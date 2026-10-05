import { redirect } from "next/navigation";
import { Entitlements } from "@/components/service/entitlements";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-237 — warranties and service contracts (`service.asset.read`). */
export default async function ServiceEntitlementsPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  const canManage = can(session, "service.asset.manage");
  // CD-244 — who may own a PM plan
  const users =
    canManage && can(session, "user.read")
      ? await getAllDirectoryUsers()
      : null;
  return (
    <Entitlements
      canManage={canManage}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
