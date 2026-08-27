import { Alert, Breadcrumb } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RequestForm } from "@/components/request-form";
import { getRequestTypes } from "@/lib/api/requests";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
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
        title={messages.common.loadError}
        description={typesResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          {
            title: (
              <Link href={ROUTES.myWork}>{messages.nav.myWork}</Link>
            ),
          },
          { title: messages.requestForm.pageTitle },
        ]}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Title level={4} className="mb-0!">
            {messages.requestForm.pageTitle}
          </Title>
          {/* §16 puts the draft status beside the heading. It was an info Alert
              across the full width, which spent the loudest element on the page
              on a line that never changes — and left a real error looking the
              same as the standing state. */}
          <Text type="secondary">{messages.requestForm.draftBanner}</Text>
        </div>
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
