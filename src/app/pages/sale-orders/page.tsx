import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { SaleOrderList } from "@/components/crm/sale-orders/sale-order-list";
import { getSaleOrders } from "@/lib/api/sales";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import type { ErpSyncStatus, SaleOrderStatus } from "@/lib/api/types";

/** CD-88 ใบสั่งขาย — ทะเบียนทุกใบในขอบเขตที่เห็น พร้อมสถานะส่ง SAP. Gate-before-fetch. */
export default async function SaleOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    erp_status?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;
  const pageSize = 50;

  const result = await getSaleOrders({
    search: query.search,
    status: (query.status as SaleOrderStatus | undefined) || undefined,
    erp_status: (query.erp_status as ErpSyncStatus | undefined) || undefined,
    view: query.view === "mine" ? "mine" : undefined,
    page,
    page_size: pageSize,
  });

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.sales.saleOrders.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.sales.saleOrders.scopeNote}
        </Text>
      </div>

      {!result.ok && (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      )}

      <SaleOrderList
        rows={result.ok ? result.data.data : []}
        total={result.ok ? result.data.total : 0}
        page={page}
        pageSize={pageSize}
        filters={{
          search: query.search,
          status: query.status,
          erpStatus: query.erp_status,
          mineOnly: query.view === "mine",
        }}
      />
    </div>
  );
}
