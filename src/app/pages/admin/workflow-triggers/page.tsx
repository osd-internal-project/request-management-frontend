import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { WorkflowTriggerAdmin } from "@/components/admin/workflow-trigger-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** เหตุการณ์ใน CTD → เริ่ม workflow บน OSD Workflow (`admin.integration.manage`). */
export default async function AdminWorkflowTriggersPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.workflowTriggers.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.workflowTriggers.subtitle}
        </Text>
      </div>

      <WorkflowTriggerAdmin />
    </div>
  );
}
