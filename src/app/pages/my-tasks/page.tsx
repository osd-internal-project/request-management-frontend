import { redirect } from "next/navigation";
import { Alert } from "antd";
import { MyTasks } from "@/components/pm/my-tasks";
import { getMyTasks } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-181 — งานโครงการของฉัน (anyone may be handed a task). */
export default async function MyTasksPage() {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);
  const result = await getMyTasks();
  return result.ok ? (
    <MyTasks tasks={result.data} />
  ) : (
    <Alert
      type="error"
      showIcon
      title={messages.common.loadError}
      description={result.error.message}
    />
  );
}
