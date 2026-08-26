import { Alert, Card } from "antd";
import Title from "antd/es/typography/Title";
import Paragraph from "antd/es/typography/Paragraph";
import { messages } from "@/lib/messages";

/**
 * AUTH-04 — the "รอจัดสังกัด" state.
 *
 * Someone who has signed in but has not been placed in the org chart has no
 * supervisor, so there is no step-1 approver and nothing they submit could
 * route. Saying that plainly is better than showing an empty work queue that
 * looks broken, or a submit button that would fail at the last step.
 */
export function PendingAssignment() {
  return (
    <div className="space-y-4">
      <Title level={4} className="mb-0!">
        {messages.myWork.title}
      </Title>

      <Card>
        <Alert type="info" showIcon title={messages.pending.title} />
        <Paragraph className="mt-3! mb-1!">{messages.pending.body}</Paragraph>
        <Paragraph type="secondary" className="mb-0!">
          {messages.pending.action}
        </Paragraph>
      </Card>
    </div>
  );
}
