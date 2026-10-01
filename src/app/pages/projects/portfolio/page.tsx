import { redirect } from "next/navigation";
import { Alert } from "antd";
import { ProjectPortfolio } from "@/components/pm/project-portfolio";
import { getPortfolio } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-192 — every running project, the most at risk first (`pm.project.read`). */
export default async function ProjectPortfolioPage() {
  const session = await getSession();
  if (!can(session, "pm.project.read")) redirect(ROUTES.projects);
  const result = await getPortfolio();
  return result.ok ? (
    <ProjectPortfolio view={result.data} />
  ) : (
    <Alert
      type="error"
      showIcon
      title={messages.common.loadError}
      description={result.error.message}
    />
  );
}
