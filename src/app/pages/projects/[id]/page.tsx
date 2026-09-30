import { notFound, redirect } from "next/navigation";
import { ProjectDetailView } from "@/components/pm/project-detail";
import { getProject } from "@/lib/api/projects";
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
  // the pickers only for who may change the manager or the team
  const users =
    (project.canManage || project.canEditTeam) && can(session, "user.read")
      ? await getAllDirectoryUsers()
      : null;

  return (
    <ProjectDetailView
      project={project}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
