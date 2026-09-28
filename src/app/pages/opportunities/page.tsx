import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import {
  OpportunityList,
  type OpportunityLayout,
} from "@/components/crm/opportunities/opportunity-list";
import {
  getLostReasons,
  getOpportunities,
  getOpportunityStageSummary,
} from "@/lib/api/sales";
import { getSalesTargets } from "@/lib/api/sales-targets";
import { getCustomers } from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CRM โอกาสการขาย — ตามขั้น มูลค่า วันคาดปิด. Gate-before-fetch. */
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    stage?: string;
    view?: string;
    follow_up?: string;
    layout?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;
  const layout: OpportunityLayout =
    query.layout === "board" ? "board" : "table";
  // กระดานต้องเห็นทุกขั้นพร้อมกัน จึงดึงเต็มเพดานของ API (`MAX_PAGE_SIZE` = 100)
  const pageSize = layout === "board" ? 100 : 50;
  const canManage = can(session, "crm.sales.manage");
  const followUp: "overdue" | "stale" | undefined =
    query.follow_up === "overdue" || query.follow_up === "stale"
      ? query.follow_up
      : undefined;

  const filterQuery = {
    search: query.search,
    stage: query.stage,
    view: query.view === "mine" ? ("mine" as const) : undefined,
    follow_up: followUp,
  };
  const board = layout === "board";

  const [listResult, customersResult, reasonsResult, summary, targets] =
    await Promise.all([
      getOpportunities({ ...filterQuery, page, page_size: pageSize }),
      can(session, "crm.customer.read")
        ? getCustomers({ page: 1, page_size: 100 })
        : Promise.resolve(null),
      // เหตุผลปิดแพ้ใช้แค่ตอนลากการ์ดไป "แพ้" — ตารางไม่ต้องดึง
      layout === "board" && canManage
        ? getLostReasons()
        : Promise.resolve(null),
      // CD-74 — ยอดต่อขั้นของทุกแถว (ไม่ใช่แค่ 100 การ์ดที่โหลด) + เป้าเดือนนี้
      board ? getOpportunityStageSummary(filterQuery) : Promise.resolve(null),
      board ? getSalesTargets() : Promise.resolve(null),
    ]);

  // เป้าที่เกี่ยวกับมุมมองนี้: "ของฉัน" = เป้าของตัวเอง · ทั้งหมด = เป้าของทีม/ฝ่าย
  // ที่มองเห็น (ถ้าไม่มี ใช้เป้าของตัวเอง).
  const targetRows = targets?.ok ? targets.data.targets : [];
  const own = targetRows.filter(
    (row) => row.scope === "user" && row.subject_id === session?.user.id,
  );
  const units = targetRows.filter((row) => row.scope === "org_unit");
  const boardTargets =
    query.view === "mine" || !units.length ? own : units.slice(0, 4);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.sales.opportunities.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.sales.opportunities.scopeNote}
        </Text>
      </div>

      <OpportunityList
        rows={listResult.ok ? listResult.data.data : []}
        total={listResult.ok ? listResult.data.total : 0}
        page={page}
        pageSize={pageSize}
        filters={{
          search: query.search,
          stage: query.stage,
          mineOnly: query.view === "mine",
          followUp,
        }}
        layout={layout}
        customers={customersResult?.ok ? customersResult.data.data : []}
        lostReasons={reasonsResult?.ok ? reasonsResult.data : []}
        canManage={canManage}
        stageSummary={summary?.ok ? summary.data : undefined}
        targets={boardTargets}
      />
    </div>
  );
}
