import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RequestForm } from "@/components/request-form";
import { getRequestTypes } from "@/lib/api/requests";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * Screen §16 หน้าที่ 3 — ยื่นคำขอ.
 *
 * The types (and therefore the whole form) are loaded server-side so the first
 * paint already knows what can be raised; only the answers are client state.
 */
export default async function NewRequestPage() {
  const session = await getSession();
  const typesResult = await getRequestTypes();

  const activeCompany = session?.companies.find(
    (company) => company.id === session.active_company_id,
  );

  if (!typesResult.ok) {
    return (
      <Alert
        type="error"
        showIcon
        message={messages.common.loadError}
        description={typesResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Title level={4} className="mb-0!">
          {messages.requestForm.title}
        </Title>
        {activeCompany && (
          <Text type="secondary">
            {messages.nav.company}: {activeCompany.name}
          </Text>
        )}
      </div>

      <RequestForm types={typesResult.data} />
    </div>
  );
}
