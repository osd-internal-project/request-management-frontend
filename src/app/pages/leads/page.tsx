import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LeadList } from "@/components/lead-list";
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
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;

  const [listResult, customersResult] = await Promise.all([
    getLeads({
      search: query.search,
      status: query.status,
      view: query.view === "mine" ? "mine" : undefined,
      page,
      page_size: 50,
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
        pageSize={50}
        filters={{
          search: query.search,
          status: query.status,
          mineOnly: query.view === "mine",
        }}
        customers={customersResult?.ok ? customersResult.data.data : []}
        canManage={can(session, "crm.sales.manage")}
      />
    </div>
  );
}
