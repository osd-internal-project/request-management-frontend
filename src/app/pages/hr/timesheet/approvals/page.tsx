import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { TimesheetApprovals } from "@/components/hr/timesheet-approvals";

const m = messages.hr.timesheet;

/** CD-231 — weeks my team submitted, waiting for me. */
export default function TimesheetApprovalsPage() {
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.approvalsTitle}
        </Title>
        <Text type="secondary">{m.approvalsHint}</Text>
      </div>
      <Card>
        <TimesheetApprovals />
      </Card>
    </div>
  );
}
