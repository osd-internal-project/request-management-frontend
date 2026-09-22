import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { QuotationList } from "@/components/crm/quotations/quotation-list";
import { getQuotations } from "@/lib/api/sales";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import type { QuotationStatus } from "@/lib/api/types";

/** CD-76 ใบเสนอราคา — ทะเบียนทุกเวอร์ชันในขอบเขตที่เห็นได้. Gate-before-fetch. */
export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    view?: string;
    superseded?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;
  const pageSize = 50;
  const showSuperseded = query.superseded === "1";

  const result = await getQuotations({
    search: query.search,
    status: (query.status as QuotationStatus | undefined) || undefined,
    current: !showSuperseded,
    view: query.view === "mine" ? "mine" : undefined,
    page,
    page_size: pageSize,
  });

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.sales.quotations.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.sales.quotations.scopeNote}
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

      <QuotationList
        rows={result.ok ? result.data.data : []}
        total={result.ok ? result.data.total : 0}
        page={page}
        pageSize={pageSize}
        filters={{
          search: query.search,
          status: query.status,
          mineOnly: query.view === "mine",
          showSuperseded,
        }}
      />
    </div>
  );
}
