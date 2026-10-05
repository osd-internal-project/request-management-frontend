import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { MyLeave } from "@/components/hr/my-leave";

const m = messages.hr.leave;

/** Bangkok's year, for the balances the page opens on. */
function bangkokYear() {
  return new Date(Date.now() + 7 * 3_600_000).getUTCFullYear();
}

/** CD-232 — การลาของฉัน. */
export default function MyLeavePage() {
  const year = bangkokYear();
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <MyLeave thisYear={year} />
    </div>
  );
}
