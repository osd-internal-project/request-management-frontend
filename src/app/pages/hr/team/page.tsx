import { Alert, Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { apiGet } from "@/lib/api/core";
import { messages } from "@/lib/messages";
import { TeamList } from "@/components/hr/team-list";
import type { Employee } from "@/components/hr/employee-types";

const m = messages.hr.employees;

/** CD-230 — ลูกทีมของฉัน: everyone below me in the org chart. */
export default async function MyTeamPage() {
  const result = await apiGet<{ items: Employee[] }>("hr/employees/team");
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.teamTitle}
        </Title>
        <Text type="secondary">{m.teamHint}</Text>
      </div>
      {result.ok ? (
        <Card>
          <TeamList rows={result.data.items} />
        </Card>
      ) : (
        <Alert type="error" showIcon title={result.error.message} />
      )}
    </div>
  );
}
