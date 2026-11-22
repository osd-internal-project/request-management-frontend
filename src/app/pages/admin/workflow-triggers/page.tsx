import { redirect } from "next/navigation";
import { WorkflowTriggerAdmin } from "@/components/admin/workflow-trigger-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

/** เหตุการณ์ใน CTD → เริ่ม workflow บน OSD Workflow (`admin.integration.manage`). */
export default async function AdminWorkflowTriggersPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.workflowTriggers.title} subtitle={messages.workflowTriggers.subtitle} />

      <WorkflowTriggerAdmin />
    </div>
  );
}
