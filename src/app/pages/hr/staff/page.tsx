import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { StaffDirectory } from "@/components/hr/staff-directory";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";

const m = messages.hr.employees;

/** CD-230 — รายชื่อทีมงาน (staffing) for HR, PM and Pre-Sales. */
export default async function StaffPage() {
  const session = await getSession();
  if (
    !canAny(session, [
      "hr.employee.read",
      "hr.employee.manage",
      "pm.project.manage",
      "presales.solution.manage",
    ])
  ) {
    redirect(HOME_PATH);
  }
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.staffTitle}
        </Title>
        <Text type="secondary">{m.staffHint}</Text>
      </div>
      <Card>
        <StaffDirectory />
      </Card>
    </div>
  );
}
