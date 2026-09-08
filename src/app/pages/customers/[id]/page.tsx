import { notFound, redirect } from "next/navigation";
import { CustomerDetailView } from "@/components/customer-detail";
import customers from "@/lib/api/customers";
import { getRequests } from "@/lib/api/requests";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * หน้ารายละเอียดลูกค้า (CM-01) — ข้อมูลหลัก + แท็บผู้ติดต่อ / ที่อยู่ /
 * ประวัติการแก้ไข / ไทม์ไลน์. This page grows into มุมมองลูกค้า 360° (C360):
 * the future ดีล/ใบเสนอราคา/เคส/การเงิน tabs mount here, each gated with
 * `can()` before any fetch (C360-04).
 */
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.customer.read")) redirect(HOME_PATH);

  const { id } = await params;

  const canReadRequests = can(session, "request.read");

  const [detailResult, historyResult, timelineResult, optionsResult, summaryResult, requestsResult] =
    await Promise.all([
      customers.getCustomer(id),
      customers.getCustomerHistory(id),
      customers.getCustomerTimeline(id),
      customers.getSegmentOptions(),
      customers.getCustomerSummary(id),
      // C360-04: gate-before-fetch — a viewer without request.read never
      // triggers this call, so no guaranteed-403 lands in the logs.
      canReadRequests
        ? getRequests({ ref_type: "customer", ref_id: id, page_size: 50 })
        : Promise.resolve(null),
    ]);

  // SCOPE-03: outside the caller's reach the backend answers 404 — render the
  // same, not an error page that admits the row exists.
  if (!detailResult.ok) notFound();

  return (
    <CustomerDetailView
      customer={detailResult.data}
      history={historyResult.ok ? historyResult.data : []}
      timeline={timelineResult.ok ? timelineResult.data : []}
      segmentOptions={optionsResult.ok ? optionsResult.data : []}
      canManage={can(session, "crm.customer.manage")}
      summary={summaryResult.ok ? summaryResult.data : null}
      relatedRequests={
        requestsResult?.ok ? requestsResult.data.data : canReadRequests ? [] : null
      }
    />
  );
}
