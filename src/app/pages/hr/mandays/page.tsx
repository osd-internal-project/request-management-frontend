import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { MandayVariance } from "@/components/hr/manday-variance";

const m = messages.hr.mandays;

/** CD-233 — Manday แผนเทียบจริง. The backend decides which projects. */
export default function MandaysPage() {
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <MandayVariance />
      </Card>
    </div>
  );
}
