import { notFound, redirect } from "next/navigation";
import { ProjectDetailView } from "@/components/pm/project-detail";
import {
  getProject,
  getProjectMilestones,
  getProjectPlan,
  getProjectProgress,
} from "@/lib/api/projects";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * CD-175 — one project. One the viewer may not see answers 404, the same as
 * one that does not exist (SCOPE-03).
 */
export default async function ProjectPage({ params }: Params) {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);

  const { id } = await params;
  const result = await getProject(id);
  if (!result.ok) notFound();
  const project = result.data;
  // CD-182 — whoever sees the project sees its milestones
  // CD-177 — and its plan
  const [milestones, plan, progress] = await Promise.all([
    getProjectMilestones(id),
    getProjectPlan(id),
    // CD-188
    getProjectProgress(id),
  ]);
  // the pickers only for who may change the manager or the team
  const users =
    (project.canManage || project.canEditTeam) && can(session, "user.read")
      ? await getAllDirectoryUsers()
      : null;

  return (
    <ProjectDetailView
      project={project}
      milestones={milestones.ok ? milestones.data : null}
      plan={plan.ok ? plan.data : null}
      progress={progress.ok ? progress.data : null}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
