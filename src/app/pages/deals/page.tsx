import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { DealList } from "@/components/deal-list";
import { getDeals } from "@/lib/api/sales";
import { getCustomers } from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CRM โอกาสการขาย — ตามขั้น มูลค่า วันคาดปิด. Gate-before-fetch. */
export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    stage?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;

  const [listResult, customersResult] = await Promise.all([
    getDeals({
      search: query.search,
      stage: query.stage,
      view: query.view === "mine" ? "mine" : undefined,
      page,
      page_size: 50,
    }),
    can(session, "crm.customer.read")
      ? getCustomers({ page: 1, page_size: 200 })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.sales.deals.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.sales.deals.scopeNote}
        </Text>
      </div>

      <DealList
        rows={listResult.ok ? listResult.data.data : []}
        total={listResult.ok ? listResult.data.total : 0}
        page={page}
        pageSize={50}
        filters={{
          search: query.search,
          stage: query.stage,
          mineOnly: query.view === "mine",
        }}
        customers={customersResult?.ok ? customersResult.data.data : []}
        canManage={can(session, "crm.sales.manage")}
      />
    </div>
  );
}
