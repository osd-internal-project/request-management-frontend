import { redirect } from "next/navigation";
import { EsignLayoutsAdmin } from "@/components/esign/esign-layouts-admin";
import { getEsignLayouts } from "@/lib/api/esign";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-165 — แม่แบบช่องลงนาม (switched-off ones too). */
export default async function EsignLayoutsPage() {
  const session = await getSession();
  if (!can(session, "esign.manage")) redirect(HOME_PATH);
  const result = await getEsignLayouts(true);
  return <EsignLayoutsAdmin layouts={result.ok ? result.data : []} />;
}
