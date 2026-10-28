import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CompanyDocuments } from "@/components/admin/documents/company-documents";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.companyDocuments;

/** เอกสารบริษัท — dated documents (issue date required) and general ones. */
export default async function CompanyDocumentsPage() {
  const session = await getSession();
  if (!can(session, "admin.document.manage")) redirect(HOME_PATH);
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      <CompanyDocuments />
    </div>
  );
}
