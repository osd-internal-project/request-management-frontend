import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LeadList } from "@/components/crm/leads/lead-list";
import {
  LEAD_LAYOUT_COOKIE,
  parseLeadLayout,
  type LeadLayout,
} from "@/lib/lead-layout";
import { getLeads } from "@/lib/api/sales";
import { getCustomers } from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CRM Lead — รับ → คัดกรอง → แปลงเป็นดีล. Gate-before-fetch. */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    view?: string;
    layout?: string;
    page?: string;
    /** CD-71 — มาจากลิงก์ "ดู Lead" ในหน้าแคมเปญ. */
    campaign_id?: string;
    /** CD-85 — Getter: เฉพาะลูกค้าใหม่. */
    new_customer?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;
  // URL ก่อน แล้วค่อยมุมมองที่ผู้ใช้เลือกไว้ครั้งก่อน (cookie ที่ LeadList เขียน)
  const layout: LeadLayout =
    parseLeadLayout(query.layout) ??
    parseLeadLayout((await cookies()).get(LEAD_LAYOUT_COOKIE)?.value) ??
    "table";
  // กระดานต้องเห็นทุกขั้นพร้อมกัน จึงดึงเต็มเพดานของ API (`MAX_PAGE_SIZE` = 100)
  const pageSize = layout === "board" ? 100 : 50;

  const [listResult, customersResult] = await Promise.all([
    getLeads({
      search: query.search,
      status: query.status,
      view: query.view === "mine" ? "mine" : undefined,
      campaign_id: query.campaign_id,
      new_customer: query.new_customer === "true",
      page,
      page_size: pageSize,
    }),
    // ตัวเลือกลูกค้าสำหรับ modal แปลงเป็นดีล — ทะเบียนที่ผู้ใช้เห็นอยู่แล้ว
    can(session, "crm.customer.read")
      ? getCustomers({ page: 1, page_size: 100 })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.sales.leads.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.sales.leads.scopeNote}
        </Text>
      </div>

      <LeadList
        rows={listResult.ok ? listResult.data.data : []}
        total={listResult.ok ? listResult.data.total : 0}
        page={page}
        pageSize={pageSize}
        filters={{
          search: query.search,
          status: query.status,
          mineOnly: query.view === "mine",
          newCustomer: query.new_customer === "true",
        }}
        layout={layout}
        customers={customersResult?.ok ? customersResult.data.data : []}
        canManage={can(session, "crm.sales.manage")}
      />
    </div>
  );
}
