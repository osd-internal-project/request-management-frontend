import { notFound, redirect } from "next/navigation";
import { LeadDetailView } from "@/components/lead-detail";
import { getCustomers } from "@/lib/api/customers";
import { getLead } from "@/lib/api/sales";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * หน้ารายละเอียด Lead — pipeline, ข้อมูลบริษัท/ที่อยู่, กิจกรรม (โทร/อีเมล/
 * นัดหมาย/งาน) และปุ่มแปลง/คัดออก. Gate-before-fetch: ตัวเลือกลูกค้าสำหรับ
 * modal แปลงเป็นโอกาสการขายดึงเฉพาะเมื่ออ่านทะเบียนลูกค้าได้.
 */
export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { id } = await params;

  const [leadResult, customersResult] = await Promise.all([
    getLead(id),
    can(session, "crm.customer.read")
      ? getCustomers({ page: 1, page_size: 100 })
      : Promise.resolve(null),
  ]);

  // SCOPE-03: outside the caller's reach the backend answers 404 — render the same.
  if (!leadResult.ok) notFound();

  return (
    <LeadDetailView
      lead={leadResult.data}
      customers={customersResult?.ok ? customersResult.data.data : []}
      canManage={can(session, "crm.sales.manage")}
    />
  );
}
