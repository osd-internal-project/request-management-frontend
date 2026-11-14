import { redirect } from "next/navigation";
import { SystemUsersAdmin } from "@/components/system/system-users-admin";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

export default async function SystemUsersPage() {
  const session = await getSession();
  if (!canSystem(session, "system.user.read")) redirect(HOME_PATH);
  return (
    <SystemUsersAdmin
      canManageRoles={canSystem(session, "system.role.manage")}
    />
  );
}
