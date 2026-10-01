import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ProjectList } from "@/components/pm/project-list";
import { getProjects, type ProjectFilters } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.projects;

/**
 * CD-175 — โครงการ. Anyone signed in may look: `pm.project.read` sees every
 * project, a manager or team member their own (the backend decides).
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<ProjectFilters>;
}) {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);

  const query = await searchParams;
  const filters: ProjectFilters = {
    q: query.q,
    status: query.status,
    scope: query.scope,
    page: query.page,
  };
  const result = await getProjects(filters);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      {result.ok ? (
        <ProjectList
          result={result.data}
          filters={filters}
          canOpen={can(session, "pm.project.manage")}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      )}
    </div>
  );
}
