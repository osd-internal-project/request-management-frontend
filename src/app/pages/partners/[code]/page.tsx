import { notFound } from "next/navigation";
import { PartnerDetailView } from "@/components/presales/partner-detail";
import { getPartner } from "@/lib/api/presales";

/**
 * CD-142 — one partner: SAP's commercial facts and the technical profile.
 * The API judges access (presales.solution.read/manage) and answers 404 for
 * a code neither SAP nor a profile knows.
 */
export default async function PartnerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await getPartner(decodeURIComponent(code));
  if (!result.ok) notFound();
  return (
    <PartnerDetailView
      // Reset the editor to what was stored after every save.
      key={result.data.profile.updatedAt ?? "new"}
      partner={result.data}
    />
  );
}
