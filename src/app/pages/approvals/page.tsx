import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ApprovalInbox } from "@/components/approval-inbox";
import approvals from "@/lib/api/approvals";
import { messages } from "@/lib/messages";

/**
 * The approval inbox (APV-02).
 *
 * Lists only what is waiting on this person — including anything they are
 * covering under a delegation (APV-03), which the backend resolves so a
 * manager on leave does not leave work stranded.
 */
export default async function ApprovalsPage() {
  const result = await approvals.getApprovalsInbox();

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.approvals.title}
        </Title>
        <Text type="secondary">{messages.approvals.subtitle}</Text>
      </div>

      {result.ok ? (
        <ApprovalInbox cases={result.data.data} total={result.data.total} />
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
