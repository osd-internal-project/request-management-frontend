import { redirect } from "next/navigation";
import { Problems } from "@/components/service/problems";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-246 — problems behind repeated faults (`service.asset.read`). */
export default async function ServiceProblemsPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  const canManage = can(session, "service.asset.manage");
  const users =
    canManage && can(session, "user.read")
      ? await getAllDirectoryUsers()
      : null;
  return (
    <Problems
      canManage={canManage}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
