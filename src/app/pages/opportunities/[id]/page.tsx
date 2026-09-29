import { notFound, redirect } from "next/navigation";
import { OpportunityDetailView } from "@/components/crm/opportunities/opportunity-detail";
import {
  getOpportunity,
  getOpportunityActivities,
  getDealHandover,
  getNegotiations,
  getPhoneReservations,
  getLostReasons,
  getQuotations,
} from "@/lib/api/sales";
import { getRequests, getRequestTypes } from "@/lib/api/requests";
import { getCustomers } from "@/lib/api/customers";
import { getOrgUnitShapes } from "@/lib/api/org-units";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

/**
 * หน้ารายละเอียดโอกาสการขาย — ขั้น มูลค่า ปิดแพ้ / เปิดใบสั่งขาย (= ปิดชนะ และ
 * จุดที่ทะเบียนลูกค้าเกิด, PO 10 ก.ย. 2569) + คำเตือน KYC ระดับ product (CM-04
 * ชุดงาน B: เตือน ไม่ block). คำขอที่อ้างโอกาสการขายนี้ gate ก่อน fetch (C360-04
 * pattern); รายชื่อลูกค้าสำหรับกล่องเปิดใบสั่งขายก็เช่นกัน.
 */
export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** `?action=sale-order` — กระดานการ์ดส่งมาเมื่อลากไปคอลัมน์ "ชนะ". */
  searchParams: Promise<{ action?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { id } = await params;
  const { action } = await searchParams;
  const canReadRequests = can(session, "request.read");
  const canManage = can(session, "crm.sales.manage");

  const opportunityResult = await getOpportunity(id);
  // SCOPE-03: unseen answers 404 — render the same.
  if (!opportunityResult.ok) notFound();

  const needsCustomerPicker =
    canManage &&
    !opportunityResult.data.customer &&
    can(session, "crm.customer.read");

  const [
    reasonsResult,
    requestsResult,
    customersResult,
    quotationsResult,
    activitiesResult,
    typesResult,
    negotiationsResult,
    phoneResult,
    handoverResult,
    teamsResult,
  ] = await Promise.all([
    getLostReasons(),
    canReadRequests
      ? getRequests({
          ref_type: "opportunity",
          ref_id: opportunityResult.data.opportunityCode,
          page_size: 50,
        })
      : Promise.resolve(null),
    needsCustomerPicker
      ? getCustomers({ page: 1, page_size: 100 })
      : Promise.resolve(null),
    // CD-76 — same `crm.sales.read` this page is already gated on.
    getQuotations({ opportunity_id: id, current: true, page_size: 50 }),
    // CD-65 — same `crm.sales.read`.
    getOpportunityActivities(id),
    // CD-81 — only to tell whether the viewer may raise the contract type.
    opportunityResult.data.contractRequestTypeCode && canReadRequests
      ? getRequestTypes()
      : Promise.resolve(null),
    // CD-79 — same `crm.sales.read`.
    getNegotiations(id),
    // CD-78 — same `crm.sales.read`.
    getPhoneReservations(id),
    // CD-84 — same `crm.sales.read`; only a won deal has one.
    opportunityResult.data.stage === "won"
      ? getDealHandover(id)
      : Promise.resolve(null),
    // CD-84 — the teams to hand over to, for whoever may send it
    // (`/org-units` answers `user.read` or `request.create`).
    canManage &&
    opportunityResult.data.stage === "won" &&
    canAny(session, ["user.read", "request.create"])
      ? getOrgUnitShapes()
      : Promise.resolve(null),
  ]);
  const contractCode = opportunityResult.data.contractRequestTypeCode ?? null;
  const contractTypeName =
    (typesResult?.ok &&
      typesResult.data.find((type) => type.code === contractCode)?.name) ||
    null;

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
      customers={customersResult?.ok ? customersResult.data.data : []}
      quotations={quotationsResult.ok ? quotationsResult.data.data : []}
      activities={activitiesResult.ok ? activitiesResult.data : []}
      canManage={canManage}
      contractTypeName={contractTypeName}
      currentUserId={session?.user.id ?? null}
      negotiations={negotiationsResult.ok ? negotiationsResult.data : null}
      phoneNumbers={phoneResult.ok ? phoneResult.data : null}
      handover={handoverResult?.ok ? handoverResult.data : null}
      handoverTeams={teamsResult?.ok ? teamsResult.data : []}
      openSaleOrderOnLoad={action === "sale-order"}
    />
  );
}
