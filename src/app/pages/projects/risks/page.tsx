import { redirect } from "next/navigation";
import { Alert } from "antd";
import { RiskAttention } from "@/components/pm/risk-attention";
import { getRiskAttention } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-183 — the risks the executives should see (`pm.project.read`). */
export default async function ProjectRisksPage() {
  const session = await getSession();
  if (!can(session, "pm.project.read")) redirect(ROUTES.projects);
  const result = await getRiskAttention();
  return result.ok ? (
    <RiskAttention rows={result.data} />
  ) : (
    <Alert
      type="error"
      showIcon
      title={messages.common.loadError}
      description={result.error.message}
    />
  );
}
