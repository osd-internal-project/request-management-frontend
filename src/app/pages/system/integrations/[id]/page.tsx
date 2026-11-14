import { redirect } from "next/navigation";
import { IntegrationDetail } from "@/components/admin/integrations/integration-detail";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

/** One integration opened from the system hub — shared, or any company's. */
export default async function SystemIntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!canSystem(session, "system.integration.manage")) redirect(HOME_PATH);

  const { id } = await params;
  const base = process.env.EXTERNAL_API_PUBLIC_URL?.replace(/\/$/, "");

  return (
    <IntegrationDetail
      id={id}
      scope="system"
      mcpEndpoint={base ? `${base}/api/v1/mcp` : null}
      externalApiBase={base ? `${base}/api/v1` : null}
      canAudit={false}
    />
  );
}
