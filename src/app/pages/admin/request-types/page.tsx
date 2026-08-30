import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RequestTypeAdmin } from "@/components/request-type-admin";
import { getAdminRequestTypes } from "@/lib/api/admin";
import orgUnitsApi from "@/lib/api/org-units";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * Screen §16 A2 — ประเภทคำขอ (ผู้ดูแล).
 *
 * Loaded from the *admin* list, which includes inactive types: a type still
 * being set up is precisely what this screen exists to finish, and the
 * requester-facing list deliberately hides it.
 */
export default async function AdminRequestTypesPage() {
  const session = await getSession();

  // The org tree feeds the `ทีมผู้รับ` selector. Fetched alongside rather than
  // on demand: it is a handful of rows and the selector is always on screen.
  const [result, unitsResult] = await Promise.all([
    getAdminRequestTypes(),
    orgUnitsApi.getOrgUnits(),
  ]);

  const activeCompany = session?.companies.find(
    (company) => company.id === session.active_company_id,
  );

  if (!result.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={result.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.requestTypes.title}
        </Title>
        <Text type="secondary">{messages.requestTypes.subtitle}</Text>
      </div>

      {/*
        The company is named on the list card §16 heads with it
        (`ประเภททั้งหมด · บริษัท OSD`), so it is not repeated here.
      */}
      <RequestTypeAdmin
        types={result.data}
        orgUnits={unitsResult.ok ? unitsResult.data : []}
        companyName={activeCompany?.name ?? null}
      />
    </div>
  );
}
