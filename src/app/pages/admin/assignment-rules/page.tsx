import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { AssignmentRulesAdmin } from "@/components/admin/assignment-rules-admin";
import { getOrgUnits } from "@/lib/api/org-units";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** ตารางทีม — งานของแต่ละบทบาทไปทีมไหน (`admin.org.manage`). */
export default async function AdminAssignmentRulesPage() {
  const session = await getSession();
  if (!can(session, "admin.org.manage")) redirect(HOME_PATH);

  const [units, users] = await Promise.all([
    getOrgUnits(),
    getAllDirectoryUsers(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.assignmentRules.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.assignmentRules.subtitle}
        </Text>
      </div>

      <AssignmentRulesAdmin
        units={(units.ok ? units.data : [])
          .filter((unit) => unit.active)
          .map((unit) => ({
            id: unit.id,
            name: unit.name,
            memberCount: unit.memberCount,
          }))}
        users={(users.ok ? users.data : []).map((user) => ({
          id: user.id,
          name: user.displayName,
        }))}
      />
    </div>
  );
}
