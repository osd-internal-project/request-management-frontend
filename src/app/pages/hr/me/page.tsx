import { Alert, Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { apiGet } from "@/lib/api/core";
import { messages } from "@/lib/messages";
import { EmployeeProfile } from "@/components/hr/employee-profile";
import type { Employee } from "@/components/hr/employee-types";

const m = messages.hr.employees;

/** CD-229 — everyone's own HR profile, read-only. */
export default async function MyProfilePage() {
  const result = await apiGet<Employee>("hr/employees/me");
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.meTitle}
        </Title>
        <Text type="secondary">{m.meHint}</Text>
      </div>
      {result.ok ? (
        <Card title={result.data.displayName}>
          <EmployeeProfile employee={result.data} />
        </Card>
      ) : (
        <Alert type="error" showIcon title={result.error.message} />
      )}
    </div>
  );
}
