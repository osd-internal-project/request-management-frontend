import { notFound, redirect } from "next/navigation";
import { QuotationDetailView } from "@/components/crm/quotations/quotation-detail";
import { PastPricingExceptions } from "@/components/pricing/pricing-exceptions-table";
import { getQuotation } from "@/lib/api/sales";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * รายละเอียดใบเสนอราคา (CD-76) — แก้ร่าง / ยื่นตรวจ margin / ส่ง / ลูกค้าตอบ /
 * ออกเวอร์ชันใหม่. ต้นทุนและ margin ถูกปกปิดที่ API ตามสิทธิ์ ไม่ใช่ที่หน้าจอ.
 */
export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { id } = await params;
  const result = await getQuotation(id);
  // SCOPE-03: unseen answers 404 — render the same.
  if (!result.ok) notFound();

  return (
    <div className="space-y-4">
      {/* CD-205 — this customer's past pricing exceptions, on other deals. */}
      <PastPricingExceptions opportunityId={result.data.opportunityId} />
      <QuotationDetailView
        // Remount on every version/refresh so the draft form starts from the
        // saved row, not from what was typed before the save.
        key={`${result.data.id}:${result.data.updatedAt}`}
        quotation={result.data}
        canManage={can(session, "crm.sales.manage")}
        canOverridePrice={can(session, "pricing.price.override")}
      />
    </div>
  );
}
