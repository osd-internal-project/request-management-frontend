import { notFound, redirect } from "next/navigation";
import { OpportunityDetailView } from "@/components/opportunity-detail";
import { getOpportunity, getLostReasons } from "@/lib/api/sales";
import { getRequests } from "@/lib/api/requests";
import { getCustomers } from "@/lib/api/customers";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

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

  const [reasonsResult, requestsResult, customersResult] = await Promise.all([
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
      customers={customersResult?.ok ? customersResult.data.data : []}
      canManage={canManage}
      openSaleOrderOnLoad={action === "sale-order"}
    />
  );
}
