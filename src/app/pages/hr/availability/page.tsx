import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { getProjects } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { AvailabilityBoard } from "@/components/hr/availability-board";

const m = messages.hr.availability;

function bangkokToday() {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * CD-232 — ความพร้อมของทีม: everyone the caller may see (the backend
 * decides), with the projects they may filter by or book onto.
 */
export default async function AvailabilityPage() {
  const session = await getSession();
  if (!session) redirect(HOME_PATH);
  const projects = await getProjects({ status: "active" });
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <AvailabilityBoard
          today={bangkokToday()}
          userId={session.user.id}
          canBookAny={
            can(session, "pm.project.manage") ||
            can(session, "hr.employee.manage")
          }
          projects={
            projects.ok
              ? projects.data.data.map((project) => ({
                  id: project.id,
                  label: `${project.projectNo} · ${project.name}`,
                  managerUserId: project.managerUserId,
                }))
              : []
          }
        />
      </Card>
    </div>
  );
}
