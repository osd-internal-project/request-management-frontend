import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { KbReviewQueue } from "@/components/kb/kb-review-queue";

const r = messages.kb.review;

/** CD-260 — what waits for review, and what is due for review. */
export default function KbReviewPage() {
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {r.queueTitle}
        </Title>
        <Text type="secondary">{r.queueHint}</Text>
      </div>
      <Card>
        <KbReviewQueue />
      </Card>
    </div>
  );
}
