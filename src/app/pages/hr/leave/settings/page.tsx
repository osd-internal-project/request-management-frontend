import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { LeaveSettings } from "@/components/hr/leave-settings";

const m = messages.hr.leave;

function bangkokYear() {
  return new Date(Date.now() + 7 * 3_600_000).getUTCFullYear();
}

/** CD-232 — HR: kinds of leave, yearly allowances, and per-person ones. */
export default async function LeaveSettingsPage() {
  const session = await getSession();
  const canManage = can(session, "hr.employee.manage");
  if (!canManage && !can(session, "hr.employee.read")) redirect(HOME_PATH);
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.settingsTitle}
        </Title>
        <Text type="secondary">{m.settingsHint}</Text>
      </div>
      <LeaveSettings canManage={canManage} thisYear={bangkokYear()} />
    </div>
  );
}
