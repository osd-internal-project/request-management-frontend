import { notFound, redirect } from "next/navigation";
import { OpportunityDetailView } from "@/components/opportunity-detail";
import { getOpportunity, getLostReasons } from "@/lib/api/sales";
import { getRequests } from "@/lib/api/requests";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * หน้ารายละเอียดโอกาสการขาย — ขั้น มูลค่า ปิดชนะ/แพ้ + คำเตือน KYC ระดับ product
 * (CM-04 ชุดงาน B: เตือน ไม่ block). คำขอที่อ้างโอกาสการขายนี้ gate ก่อน fetch
 * (C360-04 pattern).
 */
export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { id } = await params;
  const canReadRequests = can(session, "request.read");

  const opportunityResult = await getOpportunity(id);
  // SCOPE-03: unseen answers 404 — render the same.
  if (!opportunityResult.ok) notFound();

  const [reasonsResult, requestsResult] = await Promise.all([
    getLostReasons(),
    canReadRequests
      ? getRequests({
          ref_type: "opportunity",
          ref_id: opportunityResult.data.opportunityCode,
          page_size: 50,
        })
      : Promise.resolve(null),
  ]);

  return (
    <OpportunityDetailView
      opportunity={opportunityResult.data}
      lostReasons={reasonsResult.ok ? reasonsResult.data : []}
      relatedRequests={
        requestsResult?.ok
          ? requestsResult.data.data
          : canReadRequests
            ? []
            : null
      }
      canManage={can(session, "crm.sales.manage")}
    />
  );
}
