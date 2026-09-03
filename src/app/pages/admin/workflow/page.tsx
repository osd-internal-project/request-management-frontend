import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { WorkflowAdmin } from "@/components/workflow-admin";
import { getAdminRequestTypes } from "@/lib/api/admin";
import workflowApi from "@/lib/api/workflow";
import { messages } from "@/lib/messages";

/**
 * หน้า Set Workflow — the route a request type travels.
 *
 * The version being edited comes from `?definition=`, loaded here rather than
 * in the client component: the list endpoint carries no graph, and fetching it
 * on the server means the editor renders with its states already in place
 * instead of flashing empty.
 *
 * The catalog is fetched alongside for the ประเภทคำขอ selector — the same
 * lesson screen A1 records: reading the list off the existing versions alone
 * leaves a type with no workflow unable to get its first one.
 */
export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ definition?: string }>;
}) {
  const { definition } = await searchParams;

  const [definitions, types] = await Promise.all([
    workflowApi.getWorkflows(),
    getAdminRequestTypes(),
  ]);

  const selected = definition
    ? await workflowApi.getWorkflow(definition)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.workflow.title}
        </Title>
        <Text type="secondary">{messages.workflow.subtitle}</Text>
      </div>

      {definitions.ok ? (
        <WorkflowAdmin
          definitions={definitions.data}
          types={types.ok ? types.data : []}
          initial={selected?.ok ? selected.data : null}
        />
      ) : (
        <Alert type="error" showIcon message={definitions.error.message} />
      )}
    </div>
  );
}
