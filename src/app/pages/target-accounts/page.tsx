import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { TargetAccountList } from "@/components/crm/target-accounts/target-account-list";
import { getTargetAccounts } from "@/lib/api/sales";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.targetAccounts;

/** CD-85 — บริษัทเป้าหมายของแกน Getter. Gate-before-fetch. */
export default async function TargetAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    priority?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;
  const view =
    query.view === "mine" || query.view === "unassigned"
      ? query.view
      : undefined;
  const result = await getTargetAccounts({
    search: query.search,
    status: query.status,
    priority: query.priority,
    view,
    page,
  });

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
        <div>
          <Text type="secondary" className="text-xs">
            {messages.sales.leads.scopeNote}
          </Text>
        </div>
      </div>

      {result.ok ? (
        <TargetAccountList
          rows={result.data.data}
          total={result.data.total}
          page={page}
          pageSize={50}
          filters={{
            search: query.search,
            status: query.status,
            priority: query.priority,
            view,
          }}
          canManage={can(session, "crm.sales.manage")}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      )}
    </div>
  );
}
