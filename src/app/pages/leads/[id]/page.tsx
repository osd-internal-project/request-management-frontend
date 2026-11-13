import { notFound, redirect } from "next/navigation";
import { LeadDetailView } from "@/components/crm/leads/lead-detail";
import { getAgentRecords } from "@/lib/api/agent-records";
import { getCustomers } from "@/lib/api/customers";
import { getLead, getLeadFiles, getLeadSalesAutomation } from "@/lib/api/sales";
import { SalesAutomationCard } from "@/components/crm/leads/sales-automation-card";
import { getAllDirectoryUsers } from "@/lib/api/users";
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
  if (!can(session, "crm.lead.read")) redirect(HOME_PATH);

  const { id } = await params;

  const canManage = can(session, "crm.lead.manage");
  const canReadCustomers = can(session, "crm.customer.read");

  const [
    leadResult,
    filesResult,
    customersResult,
    usersResult,
    runningResult,
    automationResult,
  ] = await Promise.all([
    getLead(id),
    getLeadFiles(id),
    canReadCustomers
      ? getCustomers({ page: 1, page_size: 100 })
      : Promise.resolve(null),
    // the owner picker only — GET /users is `user.read`
    canManage && can(session, "user.read")
      ? getAllDirectoryUsers()
      : Promise.resolve(null),
    // agent jobs still running, so a reload keeps watching them; the backend filters rows per action right
    getAgentRecords({
      status: "processing",
      lead_id: id,
      page: 1,
      page_size: 10,
    }),
    // why the sales workflow stopped — same `crm.lead.read` as this page
    getLeadSalesAutomation(id),
  ]);

  // SCOPE-03: outside the caller's reach the backend answers 404 — render the same.
  if (!leadResult.ok) notFound();

  return (
    <div className="flex flex-col gap-4">
      <SalesAutomationCard
        status={automationResult.ok ? automationResult.data : null}
        target={{ kind: "leads", id }}
        canStart={canManage}
      />
      <LeadDetailView
        lead={leadResult.data}
        files={filesResult.ok ? filesResult.data : []}
        running={runningResult.ok ? runningResult.data.data : []}
        customers={customersResult?.ok ? customersResult.data.data : []}
        canManage={canManage}
        canSeeDeals={can(session, "crm.sales.read")}
        canReadCustomers={canReadCustomers}
        people={(usersResult?.ok ? usersResult.data : []).map((user) => ({
          id: user.id,
          displayName: user.displayName,
        }))}
        me={{ id: session!.user.id, displayName: session!.user.display_name }}
      />
    </div>
  );
}
