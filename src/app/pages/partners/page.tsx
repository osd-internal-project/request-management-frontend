import { redirect } from "next/navigation";
import { PartnerList } from "@/components/presales/partner-list";
import { getPartners } from "@/lib/api/presales";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-142 — คู่ค้า: SAP's suppliers with the technical profile kept here. */
export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (
    !can(session, "presales.solution.read") &&
    !can(session, "presales.solution.manage")
  ) {
    redirect(HOME_PATH);
  }
  const { q } = await searchParams;
  const result = await getPartners(q);
  return (
    <PartnerList
      q={q ?? ""}
      list={
        result.ok ? result.data : { sap_available: false, total: 0, items: [] }
      }
    />
  );
}
