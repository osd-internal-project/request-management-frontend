import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { LeaveApprovals } from "@/components/hr/leave-approvals";

const m = messages.hr.leave;

/** CD-232 — leave my people asked for, waiting for me. */
export default function LeaveApprovalsPage() {
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.approvalsTitle}
        </Title>
        <Text type="secondary">{m.approvalsHint}</Text>
      </div>
      <Card>
        <LeaveApprovals />
      </Card>
    </div>
  );
}
