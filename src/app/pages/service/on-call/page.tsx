import { redirect } from "next/navigation";
import { OnCallRotaView } from "@/components/service/on-call-rota";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-241 — ตารางเวรนอกเวลา (`service.asset.read`; writes `service.asset.manage`). */
export default async function ServiceOnCallPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  const canManage = can(session, "service.asset.manage");
  const users =
    canManage && can(session, "user.read")
      ? await getAllDirectoryUsers()
      : null;
  return (
    <OnCallRotaView
      canManage={canManage}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
