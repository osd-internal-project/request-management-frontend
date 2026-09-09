import { notFound, redirect } from "next/navigation";
import { DealDetailView } from "@/components/deal-detail";
import { getDeal, getLostReasons } from "@/lib/api/sales";
import { getRequests } from "@/lib/api/requests";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * หน้ารายละเอียดดีล — ขั้น มูลค่า ปิดชนะ/แพ้ + คำเตือน KYC ระดับ product
 * (CM-04 ชุดงาน B: เตือน ไม่ block). คำขอที่อ้างดีลนี้ gate ก่อน fetch
 * (C360-04 pattern).
 */
export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { id } = await params;
  const canReadRequests = can(session, "request.read");

  const dealResult = await getDeal(id);
  // SCOPE-03: unseen answers 404 — render the same.
  if (!dealResult.ok) notFound();

  const [reasonsResult, requestsResult] = await Promise.all([
    getLostReasons(),
    canReadRequests
      ? getRequests({
          ref_type: "deal",
          ref_id: dealResult.data.dealCode,
          page_size: 50,
        })
      : Promise.resolve(null),
  ]);

  return (
    <DealDetailView
      deal={dealResult.data}
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
