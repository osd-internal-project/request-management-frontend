import { notFound, redirect } from "next/navigation";
import { TaskWork } from "@/components/pm/task-work";
import { getTaskWork } from "@/lib/api/projects";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string; taskId: string }> };

/**
 * CD-181 — one task and its reports. A task in a project the viewer may not
 * see answers 404 (SCOPE-03).
 */
export default async function TaskPage({ params }: Params) {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);
  const { id, taskId } = await params;
  const result = await getTaskWork(id, taskId);
  if (!result.ok) notFound();
  return <TaskWork view={result.data} />;
}
