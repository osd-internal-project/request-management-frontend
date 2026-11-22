import { redirect } from "next/navigation";
import { CompanyDocuments } from "@/components/admin/documents/company-documents";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

const m = messages.companyDocuments;

/** เอกสารบริษัท — dated documents (issue date required) and general ones. */
export default async function CompanyDocumentsPage() {
  const session = await getSession();
  if (!can(session, "admin.document.manage")) redirect(HOME_PATH);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <CompanyDocuments />
    </div>
  );
}
