import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { TimesheetWeek } from "@/components/hr/timesheet-week";

const m = messages.hr.timesheet;

/** Bangkok's today, so the grid locks tomorrow and opens on this week. */
function bangkokToday() {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** CD-231 — Timesheet ของฉัน: one week at a time. */
export default function MyTimesheetPage() {
  const today = bangkokToday();
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <TimesheetWeek today={today} />
    </div>
  );
}
