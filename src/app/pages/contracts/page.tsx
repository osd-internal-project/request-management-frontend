import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ContractList } from "@/components/legal/contract-list";
import { getContracts, type ContractFilters } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.contracts;

/** CD-161 — คลังสัญญา (`legal.contract.read`). Gate-before-fetch. */
export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<ContractFilters>;
}) {
  const session = await getSession();
  if (!can(session, "legal.contract.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const filters: ContractFilters = {
    search: query.search,
    text: query.text,
    kind: query.kind,
    status: query.status,
    ends_from: query.ends_from,
    ends_to: query.ends_to,
    confidential: query.confidential,
    page: query.page,
  };
  const result = await getContracts(filters);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      {result.ok ? (
        <ContractList
          result={result.data}
          filters={filters}
          canManage={can(session, "legal.contract.manage")}
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
