import { redirect } from "next/navigation";
import { AuditScreen } from "@/components/admin/audit-screen";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

export default async function SystemAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!canSystem(session, "system.audit.read")) redirect(HOME_PATH);
  return <AuditScreen params={await searchParams} scope="system" />;
}
