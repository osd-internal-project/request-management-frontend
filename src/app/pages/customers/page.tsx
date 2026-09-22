import { redirect } from "next/navigation";
import { Alert, Button } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CustomerList } from "@/components/crm/customers/customer-list";
import customers from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH, ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * ทะเบียนลูกค้า (CM-01/08) — spec artifact 856c08fd. No §16 mockup exists for
 * CRM, so the layout follows §16 หน้าที่ 2's house style: title + scope note,
 * primary action top-right, filters above one table.
 *
 * Gate-before-fetch: a viewer without `crm.customer.read` is redirected, not
 * shown a page of guaranteed 403s.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    segment_value_id?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.customer.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;

  const [listResult, optionsResult] = await Promise.all([
    customers.getCustomers({
      search: query.search,
      status: query.status,
      segment_value_id: query.segment_value_id,
      view: query.view === "mine" ? "mine" : undefined,
      page,
      page_size: 50,
    }),
    customers.getSegmentOptions(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Title level={4} className="mb-0!">
            {messages.customers.title}
          </Title>
          {/* SCOPE-02: the row set is the backend's decision — said here so a
              short list reads as the truth rather than as a broken page. */}
          <Text type="secondary" className="text-xs">
            {messages.customers.scopeNote}
          </Text>
        </div>
        <div className="flex gap-2">
          {can(session, "admin.crm.manage") && (
            <Link href={ROUTES.customerImport}>
              <Button>{messages.customers.importer.openButton}</Button>
            </Link>
          )}
          {can(session, "crm.customer.manage") && (
            <Link href={ROUTES.newCustomer}>
              <Button type="primary">{messages.customers.newCustomer}</Button>
            </Link>
          )}
        </div>
      </div>

      {!listResult.ok && (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={listResult.error.message}
        />
      )}

      <CustomerList
        rows={listResult.ok ? listResult.data.data : []}
        total={listResult.ok ? listResult.data.total : 0}
        page={page}
        pageSize={50}
        segmentOptions={optionsResult.ok ? optionsResult.data : []}
        filters={{
          search: query.search,
          status: query.status,
          segmentValueId: query.segment_value_id,
          mineOnly: query.view === "mine",
        }}
      />
    </div>
  );
}
