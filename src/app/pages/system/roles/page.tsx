import { redirect } from "next/navigation";
import { SystemRolesAdmin } from "@/components/system/system-roles-admin";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

export default async function SystemRolesPage() {
  const session = await getSession();
  if (!canSystem(session, "system.role.manage")) redirect(HOME_PATH);
  return <SystemRolesAdmin />;
}
