import { redirect } from "next/navigation";
import { EsignAuthoritiesAdmin } from "@/components/esign/esign-authorities-admin";
import { getEsignAuthorities } from "@/lib/api/esign";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-172 — ทะเบียนผู้มีอำนาจลงนาม. */
export default async function EsignAuthoritiesPage() {
  const session = await getSession();
  if (!can(session, "esign.manage")) redirect(HOME_PATH);
  const [rows, users] = await Promise.all([
    getEsignAuthorities(),
    can(session, "user.read") ? getAllDirectoryUsers() : Promise.resolve(null),
  ]);
  return (
    <EsignAuthoritiesAdmin
      rows={rows.ok ? rows.data : []}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
